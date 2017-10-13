"""
define this module as a notebook and a notebook server extension
"""
from notebook.utils import url_path_join


# Jupyter Notebook Extension points
def _jupyter_nbextension_paths():
    return [dict(
        section="tree",
        # the path is relative to the `nb_data_ui` directory
        src="static",
        # directory in the `nbextension/` namespace
        dest="nb_data_ui",
        # _also_ in the `nbextension/` namespace
        require="nb_data_ui/index"
    )]

# Jupyter Notebook Server Extension point
def _jupyter_server_extension_paths():
    return [{
        "module": "nb_data_ui"
    }]


# Jupyter Notebook Server Extension point
# this method is called when the notebook starts up
def load_jupyter_server_extension(nbapp):
    nbapp.log.info("nb_data_ui tree ext enabled!")
    setup_handlers(nbapp.web_app)


# Setup custom request handlers
def setup_handlers(web_app):
    handlers = []
    for module in ('upload', 'download'):
        mod = __import__('nb_data_ui.{}.handlers'.format(module),
                         fromlist=['default_handlers'])
        handlers.extend(mod.default_handlers)

    # update handler url patterns with configured base_url
    new_handlers = []
    for handler in handlers:
        # prepend base_url if required
        pattern = url_path_join(web_app.settings['base_url'], handler[0])
        new_handler = tuple([pattern] + list(handler[1:]))
        new_handlers.append(new_handler)

    host_pattern = '.*$'
    web_app.add_handlers(host_pattern, new_handlers)
