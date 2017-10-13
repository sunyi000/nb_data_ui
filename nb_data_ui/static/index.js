// TODO:
//    - when changing folders, check for downloads in progress
//       -> on page-load ... check status?
//    - can we recheck dropbox upload progress as well?
//       -> we have dropbox.save job id to check with dropbox about progress
//          but on page load we don't have that anymore
//          can we get dropbox jobid and query ti?
//       -> maybe keep track of uploads per tmpurl on notebook side
//          and only track progress via notebook? (can be re-checked on page load)
//    -> think about generic background job tracking ...

define(["base/js/namespace",
        "base/js/utils",
        "base/js/events",
        "services/config",
        "contents",
        "nbextensions/nb_data_ui/import_service",
        "nbextensions/nb_data_ui/tempurl_service",
        "nbextensions/nb_data_ui/alertarea",
        "nbextensions/nb_data_ui/ecostore/ecostore",
        "nbextensions/nb_data_ui/dropbox/dropbox"
        ],
function(Jupyter,
         utils,
         events,
         config,
         contents,
         import_service,
         tempurl_service,
         alertarea,
         ecostore,
         dropbox
         ) {


    // add alert area
    $('#notebook_toolbar').prepend('<div class="container-fluid" id="alert-area"></div>')
    var alerts = new alertarea.AlertArea('#alert-area')

    // TODO: should I init these variables in 'load_ipython_extension?'

    // general options for all services we use
    var common_options = {
        base_url: utils.get_body_data("baseUrl"),
        notebook_path: utils.get_body_data("notebookPath")
    };
    // read configuration ... for this service specifically
    var cfg = new config.ConfigSection('fetch', common_options);
    cfg.load();
    common_options.config = cfg;
    // and global configuration as well
    var common_config = new config.ConfigSection('common', common_options);
    common_config.load();


    // Instantiate main objects
    var imports = new import_service.ImportService()
    var tempurls = new tempurl_service.TempUrlService()
    var remotes = {
        // TODO: pass on config? common_options?
        dropbox: new dropbox.DropBox(common_options),
        ecostore: new ecostore.Lisbon(common_options)
    }

    var progress_timer = null


    // hold reference to Jupyter.NotebookList methods
    var NoteBookList_selection_changed = Jupyter.NotebookList.prototype._selection_changed

    // entry point to load this extension into jupyter frontend
    function load_ipython_extension() {
        console.log("loading dropbox extension")

        // !!!!!!!!!! patch NotebookList _selection_changed to emit an event
        Jupyter.NotebookList.prototype._selection_changed = function() {
            NoteBookList_selection_changed.apply(this)
            events.trigger('selection_changed.NotebookList')
        }

        events.on('selection_changed.NotebookList', function(){

            var selected = Jupyter.notebook_list.selected
            var enable_button = true
            if (selected <= 0) {
                enable_button = false
            } else {
                Jupyter.notebook_list.selected.forEach(function(file, idx){
                    if (file.type === 'directory') {
                        enable_button = false
                    }
                })
            }

            if (enable_button) {
                saver_btn.css('display', 'inline-block')
            } else {
                saver_btn.css('display', 'none')
            }


        })

        // Load css first
        $('<link/>')
            .attr({
                id: 'remote_import_css',
                rel: 'stylesheet',
                type: 'text/css',
                // href: require.toUrl('./main.css')
                href: require.toUrl('./nbextensions/nb_data_ui/main.css')
            })
            .appendTo('head');

        if (!Jupyter.notebook_list) {
            return
        }

        /* locate the right-side dropdown menu of apps and notebooks */
        var btnbar = $('.tree-buttons')

        // setup dropbox buttons
        // TODO: classes to use on a tag? ... dropbox-dropin-progress, dropbox-dropin-success, dropbox-dropin-disabled, dropbox-dropin-error
        var chooser_btn = $('<a href="#" class="dropbox-dropin-btn dropbox-dropin-default"><span class="dropin-btn-status"></span>Choose from Dropbox</a>')

        var chooser_ecostore = $('<a href="#" class="btn btn-xs btn-default">Choose from EcoStore</a>')

        var saver_btn = $('<a href="#" class="dropbox-dropin-btn dropbox-dropin-default"><span class="dropin-btn-status"></span>Save to Dropbox</a>')
        saver_btn.css('display', 'none')
        $('.dynamic-buttons').append(saver_btn)


        // add buttons to UI
        btnbar.children('div').prepend(chooser_btn, chooser_ecostore)

        // hook up events on buttons
        chooser_btn.click(function(evt) {
            evt.preventDefault()
            // open dialog
            remotes.dropbox.pull()
            // post import
            .then(function(files) {
                var path = Jupyter.notebook_list.notebook_path
                // TODO: sanitize files, ... check for duplicates ... already in progress?
                for (var i = 0; i < files.length; i++) {
                    // dropbox has download url in 'link' key
                    files[i]['url'] = files[i]['link']
                    delete files[i]['link']
                }
                // rename key 'link' to 'url'
                return imports.post(path, files)
            })
            // import success?
            .then(add_files_to_notebook)
            // some error happened in chain
            //  If more error handling control is needed, we have to return custom
            //  promises at each success step were needed ... return Promise.reject({....})
            .catch(function(error) {
                // ajax error?
                alerts.error(error)
                // error options here:
                //  1. "User canceled dialog" ... dropbox browser has been closed without select
                //  2. ajax error ....

                // error.xhr.status ... 404, .. ?

            })
        })

        saver_btn.click(function(evt) {
            evt.preventDefault()
            // copy selected elements
            var selected = Jupyter.notebook_list.selected.slice()
            var files = []
            selected.forEach(function(elem, idx) {
                // TODO: get separate token / tmpurl for each single file
                //       backend could deny parallel downloads?
                //       backand could track single download? (and progress)
                if (elem.type == 'file') {
                    files.push(elem.name)
                }
            })
            if (files.length > 0) {
                tempurls.post(Jupyter.notebook_list.notebook_path, files)
                .then(function(temp_file_urls) {
                    var dropbox_files = []
                    temp_file_urls.forEach(function(temp_file, idx){
                        dropbox_files.push({
                            url: temp_file.url,
                            filename: temp_file.name
                        })
                    })

                    var progress_callback = function() {
                        var notify = true
                        return function(porgress) {
                            if (notify) {
                                alerts.info('Upload to Dropbox started', 5000)
                                notify = false
                            }
                        }
                    }()

                    return remotes.dropbox.push(dropbox_files, progress_callback)
                })
                .then(function(message) {
                    alerts.success('Upload to dropbox finished')
                })
                .catch(function(error){
                    alerts.error(error)
                })
            }
        })

        chooser_ecostore.click(function(evt){
            evt.preventDefault()
            // open dialog
            remotes.ecostore.pull()
            // post import
            .then(function(files) {
                var path = Jupyter.notebook_list.notebook_path
                // TODO: sanitize files, ... check for duplicates ... already in progress?
                for (var i = 0; i < files.length; i++) {
                    // swift name contains path separator
                    files[i]['name'] = files[i]['name'].replace(/\//g, '_')
                }
                return imports.post(path, files)
            })
            // import success?
            .then(add_files_to_notebook)
            // some error happened in chain
            //  If more error handling control is needed, we have to return custom
            //  promises at each success step were needed ... return Promise.reject({....})
            .catch(function(error) {
                // ajax error?
                alerts.error(error)
                // error options here:
                //  1. "User canceled dialog" ... dropbox browser has been closed without select
                //  2. ajax error ....

                // error.xhr.status ... 404, .. ?

            })

        })
    }

    return {
        load_ipython_extension: load_ipython_extension
    }


    // find item in file list by name (only searches .new-file items)
    function find_item_by_name(name, newfile=true) {
        var $item = null
        // iterate over all .new-file items
        var selector = newfile ? '.list_item.new-file' : '.list_item:not(.new-file)'
        $.each(Jupyter.notebook_list.element.find(selector), function(k,v) {
            if ($(v).data('name') === name) {
                // keep item
                $item = $(v)
                // stop loop
                return false;
            }
            // keep looping
            return true;
        })
        return $item
    }


    // format bytes in human readable units
    function file_size(bytes, kibibytes=false) {
        var kibi_prefixes = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi', 'Yi']
        var metric_prefixes = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']

        var prefixes, order, magn
        if (kibibytes) {
            prefixes = kibi_prefixes
            if (bytes) {
                order = Math.trunc(Math.log2(bytes) / 10)
            } else {
                order = 0
            }
            magn = 1 << (order * 10)
        } else {
            prefixes = metric_prefixes
            if (bytes) {
                order = Math.trunc(Math.log2(bytes) / 10)
            } else {
                order = 0
            }
            magn = Math.pow(10, order * 3)
        }
        return (bytes / magn).toPrecision(4) + ' ' + prefixes[order] + 'B'
    }


    function set_item_progress($item, progress) {

        var percent = 0
        var text = ''

        if (progress.size < 0) {
            percent = 100 // unknown size... we show the full progress bar
            text = file_size(progress.bytes)
        } else {
            percent = progress.bytes * 100 / progress.size
            text = percent.toFixed(0) + '%'
        }

        var progress_bar = $item.find('.progress-bar')
        progress_bar.css('width', percent + '%')

        progress_bar.text(text)
    }


    // fetch progress state for current folder and update UI
    function update_progress() {

        var path = Jupyter.notebook_list.notebook_path

        imports.get(path)
        .then(function(files) {
            // set to true if we need to continue polling for progress
            var poll = false
            // set to true if file list require refresh
            var refresh_list = false
            Object.keys(files.value).sort().forEach(function(key, idx) {
                var file = files.value[key]

                var $item = find_item_by_name(file.name)

                if (! $item) {
                    // console.log('Item ' + file.name + ' not found ' + file.state)
                    if (! find_item_by_name(file.name, false)) {
                        refresh_list = true
                    }
                    return
                }
                set_item_progress($item, file.progress)
                if (file.state < 3) {  // state < 3 ... still in progress
                    poll = true
                } else {
                    // stop progress bar
                    $item.find('.progress-bar').removeClass('active progress-bar-striped')
                    // schedule item for removal
                    window.setTimeout(function() {
                        $item.remove()
                    }, 5000)
                }
            })
            if (poll) {
                start_progress_polling()
            } else {
                // refresh file list
                Jupyter.notebook_list.load_list()
            }
        })
        .catch(function(error){
            alerts.error(error)
        })

    }

    function start_progress_polling() {
        if (progress_timer) {
            // already running
            return
        }
        progress_timer = window.setTimeout(function() {
            // timer fired let's reset our variable
            // this is probably a bad place to do that, because
            // a update_progress ajax call may still be in progress while
            // the user starts a new import, which will trigger another start_polling
            // in such a case we may have two update_progress ajax calls running at the same time and slowest one will win UI update
            // ... it is probably not a huge problem, as import is triggered by a user action and should have low frequency
            // ... only problem is, that we then have two update_progress timers running for the same thing
            progress_timer = null
            update_progress()
        }, 1000)
    }


    // takes return value from import.post and adds to notebook display list
    function add_files_to_notebook(files) {
        Object.keys(files.value).sort().forEach(function(key, idx) {
            var file = files.value[key]
            // add / update download item to display list
            if (file.state >= 3) {
                // skip finished downloads
                return
            }

            // TODO: check exists https://github.com/jupyter/notebook/blob/179bb24fbf79d153812858126127a91431da3319/notebook/static/tree/js/notebooklist.js#L1065
            // 1. get item
            var item = Jupyter.notebook_list.new_item(0, false)
            item.addClass('new-file')
            // that.add_name_input(f.name, item
            item.data('name', file.name)
            var file_ext = utils.splitext(file.name)[1]
            var icon_type = file_ext === '.ipynb' ? 'notebook' : 'file'
            item.find(".item_icon").addClass(Jupyter.NotebookList.icons[icon_type]).addClass('icon-fixed-width');
            item.find(".item_name").empty().text(file.name)

            var progress_bar = $('<div class="progress" style="width:8em;"><div class="progress-bar progress-bar-striped active" role="progressbar" style="min-width:2em;width:0%;"></div></div>')

            item.find('.item_buttons')
                .empty()
                // .append(progress_txt)
                .append(progress_bar)

            if (file.progress.size) {
                item.find('.item_buttons').after('<span class="pull-right" style="margin-right:10px;">' + file_size(file['progress']['size']) + '</span>')
            }

            set_item_progress(item, file.progress)

        })

        start_progress_polling()

    }


})
