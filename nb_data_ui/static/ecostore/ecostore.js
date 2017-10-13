// Lisbon integration into notebook data extenion

requirejs.config({
    //Remember: only use shim config for non-AMD scripts,
    //scripts that do not already call define(). The shim
    //config will not work correctly if used on AMD scripts,
    //in particular, the exports and init config will not
    //be triggered, and the deps config will be confusing
    //for those cases.
    shim: {
        'nbextensions/nb_data_ui/lisbon': {
            deps: [],
            exports: "Lisbon",
            init: function () {
                return window.Lisbon
            }
        }
    }
})


define([
    "nbextensions/nb_data_ui/lisbon",
    "base/js/utils",
    ],
    function(Lisbon,
             utils) {

        var Lisbon = function(options) {
            options = options || {}
            this.base_url = options.base_url || ""
        }

        Lisbon.prototype.pull = function() {
            return new Promise(function(resolve, reject) {

                var lisbon_options = {
                    title: 'EcoStore',
                    src: 'https://swift.rc.nectar.org.au/v1/AUTH_2cbe8b599c8241c68035164e63727197/EcoStore',
                    isXML: true,
                    hideSubtitle: 0,
                    success: function(selected) {
                        resolve(selected)
                    },
                    cancel: function() {
                        reject('User cancelled dialog')
                    }
                }
                var chooser = new window.Lisbon.Chooser(lisbon_options).run()
            })
        }

        return {
            'Lisbon': Lisbon
        }

    }
)
