/*

    A service to handle file import from external cloud storage services.

    This is rather meant as API service, to query notebook server for import / export state,
    and manage import / export tasks.
*/


define(["base/js/utils"], function(utils) {

    "Use strict"

    // constructor
    var ImportService = function(options) {
        options = options || {}
        // notebook server prefix
        this.base_url = options.base_url || ""
    }

    ImportService.prototype.api_url = function() {
        var url_parts = [
            this.base_url, 'api/fetch',
            utils.url_join_encode.apply(null, arguments)
        ]
        return utils.url_path_join.apply(null, url_parts)
    }


    /**
     * Make an API call
     *
     * path ... the contents / workspace folder to work within
     * files ... object(s) {'url', 'name'? } to fetch
     *
     * returns a Promise with  resolves to status ok or error
     */
    ImportService.prototype.post = function(path, files, options) {
        var settings = {
            // request
            method : "POST",
            cache : false,
            // post data
            contentType: "application/json",
            data: JSON.stringify(files),
            // response data
            dataType : "json"
        }
        var url = this.api_url(path)

        return utils.promising_ajax(url, settings)
    }


    /**
     *
     * path ... contents / workspace folder to query
     *
     * returns list of current fetches in progress
     *
     * TODO: add option to retrieve finished fetches?
     */
    ImportService.prototype.get = function(path, options) {
        var settings = {
            // request
            method : "GET",
            cache : false,
            // response data
            dataType : "json"
        }
        var url = this.api_url(path)
        return utils.promising_ajax(url, settings)
    }


    // notebook list: ... items with '.list_item:not(.new-file)' .. won't be cleared




    // module exports
    return {
        'ImportService': ImportService
    }

})
