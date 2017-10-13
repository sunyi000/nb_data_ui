import functools
import json
import os
import secrets
import stat
import time
from urllib.request import pathname2url

from notebook.base.handlers import (
    IPythonHandler, APIHandler, json_errors, path_regex
)
from notebook.utils import url_path_join
from tornado import gen, web, escape

# TODO: need a way to configure external url?
# TODO: the API is very UI oriented and should probably be changed
# TODO: we should clean up out dated tokens some time

class TokenManager(object):
    """stores tokens plus additional information
       tokeninfo:
           created: ... timestamp when created
           expires: ... timestamp when token becomes invalid
           path: ... the url path to verify
    """

    def __init__(self):
        self._tokens = {}

    def validate(self, token, path):
        # check if given token is valid
        if not token:
            return False
        if token not in self._tokens:
            return False
        # check timestamp etc....
        info = self._tokens[token]
        if path != info['path']:
            # invalid token for path
            return False
        if time.time() > info['expires']:
            # token timed out ... remove it
            del self._tokens[token]
            # TODO: maybe this would be a good place to check for expired
            #       tokens to clean up?
            return False
        return True

    def create(self, path=None, duration=60 * 60):
        # create new token
        # TODO: assert that token does not exist?
        token = secrets.token_urlsafe(32)
        now = time.time()
        self._tokens[token] = {
            'created': now,
            'path': path,
            'expires': now + duration,
        }
        return token

    def __getitem__(self, key):
        return self._tokens[key]

    def __delitem__(self, key):
        del self._tokens[key]

    def __contains__(self, key):
        return key in self._tokens


# Global TOKEN storage
TOKENS = TokenManager()


def validate_token(method):
    """decorator for request handler methods to validate token in request"""

    @functools.wraps(method)
    def wrapper(self, path, *args, **kwargs):
        if self.request.method not in ('GET', 'HEAD'):
            raise web.HTTPError(403)
        token = self.get_argument('dltoken')  # raises 400 ... bad request
        if not TOKENS.validate(token, path):
            self.log.warn('Token for {} not valid'.format(path))
            raise web.HTTPError(403)
        # TODO: attach decoded token to request or pass as method argument ....
        #       for further validation (e.g. path componont must match etc...)
        # all good so far ... call original
        return method(self, path, *args, **kwargs)

    return wrapper


class TokenHandler(APIHandler):
    """generate a download url with a token for sharing"""

    # TODO: this sholud be a post and path should reference a file
    #       return value sholud be full url to download file including token?
    @json_errors
    @web.authenticated
    @gen.coroutine
    def post(self, path):
        # set various headers ???..

        path = path.strip('/')
        # ospath = self.contents_manager._get_os_path(path)
        files = self.get_json_body()

        result = []
        for file in files:
            # TODO: check if path/file exists and can be downloaded

            filepath = os.path.join(path, file)
            if not self.contents_manager.file_exists(filepath):
                # TODO: return something to user that file doesn't exist
                continue

            token = TOKENS.create(filepath)
            # TODO: do I need to urlencode the filepath?
            result.append({
                'url': '{}://{}{}?dltoken={}'.format(
                    self.request.protocol,
                    self.request.host,
                    pathname2url(url_path_join(self.base_url, 'tmpurl', filepath)),
                    token
                ),
                'name': file,
                'token': token
            })
        self.finish(json.dumps(result))


class DownloadHandler(IPythonHandler):
    """download a file, verifying that request contains a valid download token"""

    # @validate_token
    # @gen.coroutine
    # def head(self, path):
    #     # set caching headers and other stuff here

    #     # get token from request
    #     # check if token exists
    #     # check timestamp of token against now
    #     path = path.strip('/')
    #     dest = os.path.join(
    #         self.contents_manager._get_os_path(path),
    #     )

    #     # TODO: do some sanity checks that we don't access files outside and
    #     #       block hidden etc... files
    #     #self.log.info("Refusing to serve hidden file, via 404 Error")
    #     #raise web.HTTPError(404)

    #     self.set_header('Content-Disposition', 'attachment; filename="{}"'.format(escape.url_escape(os.path.basename(dest))))
    #     return web.StaticFileHandler.get(self, path)

    @validate_token
    @gen.coroutine
    def get(self, path):
        # TODO: all sorts of caching and etag headers would be great here
        # set caching headers and other stuff here
        # see for simple download https://github.com/jupyter/notebook/blob/9f5926ec14f504547a711db3df41592740a5501d/notebook/files/handlers.py
        path = path.strip('/')
        ospath = os.path.join(
            self.contents_manager._get_os_path(path),
        )
        # TODO: could also do some progress tracking here ....
        #       e.g. set up progress handler for file / token combo
        #            token can't be used twice at the same time? (should we support range headers?)
        #            token get's deleted/invalidated once file has been downloaded with that token once?

        # TODO: do some sanity checks that we don't access files outside and
        #       block hidden etc... files
        #self.log.info("Refusing to serve hidden file, via 404 Error")
        #raise web.HTTPError(404)

        # size = os.stat(dest)[stat.ST_SIZE]
        # self.set_header('Content-Length', size)
        self.set_header('Content-Disposition', 'attachment; filename="{}"'.format(escape.url_escape(os.path.basename(ospath))))
        chunk_size = 64 * 1024
        with open(ospath, 'rb') as file:
            chunk = file.read(chunk_size)
            while chunk:
                # TODO: update progress here somewhere?
                self.write(chunk)
                yield self.flush()
                chunk = file.read(chunk_size)
        # remove token after successful download
        token = self.get_argument('dltoken')
        del TOKENS[token]

        self.finish()


default_handlers = [
    # ( url pattern, handler class, {kwargs to init handler} )
    (r"/api/tmpurl{}".format(path_regex), TokenHandler),
    (r"/tmpurl/(.*)", DownloadHandler),
]
