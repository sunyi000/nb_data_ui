requirejs.config({
    paths: {
        "dropboxchooser": ["https://www.dropbox.com/static/api/2/dropins"]
    },
    //Remember: only use shim config for non-AMD scripts,
    //scripts that do not already call define(). The shim
    //config will not work correctly if used on AMD scripts,
    //in particular, the exports and init config will not
    //be triggered, and the deps config will be confusing
    //for those cases.
    shim: {
        'dropboxchooser': {
            deps: [],
            exports: "Dropbox",
            init: function () {
                return window.Dropbox
            }
        }
    }
})


define([
    "dropboxchooser",
    "base/js/utils",
    ],
    function(Dropbox,
             utils
             ) {

        var DropBox = function(options) {
            options = options || {}
            this.base_url = options.base_url || ""
            // TODO: is this really a good place to wait for the ajax call?
            // make sure options.config is a promise
            options.config.loaded.then(function() {
                if (options.config.data.dropbox) {
                    // TODO: would be nice to spit out some warning or
                    //       deactivate dropbox plugin if not configure
                    window.Dropbox.appKey = options.config.data.dropbox.appkey
                } else {
                    console.log('No dropbox appkey configured ... extension will not work')
                }
            })
        }

        // get list of urls from remote storage
        DropBox.prototype.pull = function() {
            // TODO: any notifications if user closes window?
            return new Promise(function(resolve, reject) {

                var dropbox_options = {
                    success: function(selected) {
                        // TODO: could do some filtering here?
                        resolve(selected)
                    },
                    cancel: function() {
                        // TODO: rather call resolve with empty list?
                        //       can I detect errors here?
                        reject('User cancelled dialog')
                    },
                    linkType: 'direct', // or 'preview'
                    multiselect: true,
                    // extensions: ['.pdf', '.doc', ...]
                }

                Dropbox.choose(dropbox_options)
            })
        }

        // push list of urls to remote storage
        DropBox.prototype.push = function(files, progress_callback) {
            return new Promise(function(resolve, reject) {

                var dropbox_options = {
                    files: files,
                    success: function() {
                        console.log('Upload to dropbox submitted')
                        resolve('Upload to dropbox finished')
                    },
                    progress: function(progress) {
                        if (progress_callback) {
                            progress_callback(progress)
                        }
                        // console.log('upload progress', progress)
                        // Dropbox doesn't return a useful progress indicator
                        // it is 0 for still going and 1 for finished
                    },
                    cancel: function() {
                        reject('User cancelled dialog')
                    },
                    error: function(errorMessage) {
                        reject('Push to Dropbox failed: ' + errorMessage)
                    }
                }

                Dropbox.save(dropbox_options)


            })
        }


        return {
            'DropBox': DropBox
        }
})
