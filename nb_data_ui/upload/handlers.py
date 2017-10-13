from concurrent.futures import ThreadPoolExecutor
import json
from math import log2, log10
import os

from notebook.base.handlers import (
    IPythonHandler, APIHandler, json_errors, path_regex
)
import requests
from tornado import gen, web, escape
from tornado.concurrent import run_on_executor

# TODO: API is very UI oriented and should probably be changed

# TODO: this is probably bad .... we Download state on python module level
#       sholud be fine for a single process app, but this will cause
#       problems as soon as we use multiple processes
dl_state = {}
# states:
PENDING = 1
RUNNING = 2
SUCCESS = 3
FAILED = 4

# file size formatting
_kibi_prefixes = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi']
_metric_prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']


def file_size(size, kibibytes=False):
    # determine binary order
    # (coerce to int, // still returns a float)
    if kibibytes:
        prefixes = _kibi_prefixes
        # binary order in steps of 10 ... 10 digits make one step
        order = int(log2(size) / 10) if size else 0
        #
        magn = (1 << (order * 10))
    else:
        prefixes = _metric_prefixes
        # metric order in steps of 3 ... 3 digits make one step
        order = int(log10(size) / 3) if size else 0
        #
        magn = 10 ** (order * 3)
    # format file size
    # (.4g results in rounded numbers for exact matches and max 3 decimals,
    # should never resort to exponent values)
    return '{:.4g} {}B'.format(size / magn, prefixes[order])


class URLFetchHandler(APIHandler):

    # TODO: should this be on class or module?
    executor = ThreadPoolExecutor(3)

    # @json_errors
    # @web.authenticated
    # def post(self, urls):

    #     self.finish(json.dumps({}))

    # override get so that we return a json error
    get = json_errors(APIHandler.get)

    @json_errors
    @web.authenticated
    def post(self, path):
        path = path.strip('/')
        ospath = self.contents_manager._get_os_path(path)
        files = self.get_json_body()
        # add downloads to queue
        for file in files:
            # create state tracking object
            dest = os.path.join(
                ospath,
                file['name']
            )

            if path in dl_state and dl_state[dest].get('state') not in (FAILED, None):
                del dl_state[dest]
                # ignore it, ... file is already downloading or already available
                self.log_info('Ignore fetch request {}'.format(dest))
                continue
            dl_state[dest] = {
                'state': PENDING,
                'file': file,
                'progress': {
                    'size': file.get('bytes', None),
                    'bytes': 0,
                },
                'path': path,
                'dest': dest
            }
            # queue download
            self.log.info('Schedule download of {}'.format(dest))
            self.download(dest)
        # define return value ....
        #    state of each file? (accept, ignored, errors?, etc...)

        # build info for all existing downloads at path
        result = {
            'value': {},
            'error': False
        }
        # file in progress may not yet exist on file system
        for key in dl_state:
            if os.path.dirname(key) != ospath:
                # check if tracked file is within folder
                continue
            # TODO: could check file exists or not (also verify that download already started)
            #       use self.content_manager.get("<path>")
            #                               .file_exists(...)
            #                         etc...
            result['value'][os.path.basename(key)] = {
                'name': os.path.basename(key),
                'progress': dl_state[key]['progress'],
                'state': dl_state[key]['state']
            }

        self.finish(json.dumps(result))

    @json_errors
    @web.authenticated
    def get(self, path):
        # download progress: https://stackoverflow.com/questions/37573483/progress-bar-while-download-file-over-http-with-requests
        #                    https://gist.github.com/gschizas/3731992
        #                    https://gist.github.com/gschizas/3731992
        self.log.debug('Get Progress: {}'.format(path))

        path = path.strip('/')
        ospath = self.contents_manager._get_os_path(path)

        result = {
            'value': {},
            'error': False
        }

        for key in dl_state:
            if os.path.dirname(key) != ospath:
                # file in other folder ... skip it
                continue
            # TODO: see checks mentioned as in post method
            # TODO: could check file exists or not (also verify that download already started)
            #       use self.content_manager.get("<path>")
            #                               .file_exists(...)
            #                         etc...
            result['value'][os.path.basename(key)] = {
                'name': os.path.basename(key),
                'progress': dl_state[key]['progress'],
                'state': dl_state[key]['state']
            }
        self.finish(json.dumps(result))

    @run_on_executor
    def download(self, dest):
        # check state
        state = dl_state.get(dest, None)
        if not state:
            self.log.warn('No State for {}'.format(dest))
            # no state.... ignore it
            return
        # download file and track progress
        self.log.info('Requesting {} from {}'.format(dest, state['file']['url']))
        res = requests.get(state['file']['url'], stream=True)
        progress = state['progress']
        # set size reported from http header or use size provided from fetch request
        if 'Content-Length' in res.headers:
            progress['size'] = int(res.headers.get('Content-Length').strip())
        progress['bytes'] = 0

        # TODO: what about files thate are 0 size?
        # TODO: change progress from int to dict and add multiple values (size + current bytes)
        #                                    maybe include percent if known
        # TODO: we may loose exceptions here somewhere
        with open(dest, 'wb') as file:
            state['state'] = RUNNING
            for buf in res.iter_content(1024 * 1024):
                if buf:
                    file.write(buf)
                    progress['bytes'] += len(buf)
                    self.log.info('Progress: {} - {}'.format(dest, file_size(progress['bytes'])))
            state['state'] = SUCCESS


default_handlers = [
    # ( url pattern, handler class, {kwargs to init handler} )
    (r"/api/fetch{}".format(path_regex), URLFetchHandler),
]
