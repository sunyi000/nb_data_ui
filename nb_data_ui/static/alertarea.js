


define([], function(){


    var AlertArea = function(selector) {

        this.element = $(selector)

        this.timeout = 10000  // 10s
    }


    AlertArea.prototype.message = function(content, severity, timeout) {

        var alert = $('<div class="alert alert-dismissable show" role="alert"></div>')
        alert.addClass('alert-' + severity)
        // add close button
        alert.append('<button type="button" class="close" data-dismiss="alert" aria-label="close"><span aria-hidden="true">x</span></button>')
        // add message
        alert.fadeIn(200)
        alert.append('<span>' + content + '</span>')

        this.element.append(alert)

        if (timeout === undefined ) {
            timeout = this.timeout
        }
        if (timeout > 0) {
            // message times out
            setTimeout(function() {
                // fade out and remove from dom
                alert.fadeOut(200, function() { this.remove() })
            }, timeout)
        }
    }

    AlertArea.prototype.success = function(content, timeout) {
        this.message(content, 'success', timeout)
    }

    AlertArea.prototype.info = function(content, timeout) {
        this.message(content, 'info', timeout)
    }

    AlertArea.prototype.warn = function(content, timeout) {
        this.message(content, 'warning', timeout)
    }

    AlertArea.prototype.error = function(content, timeout) {
        this.message(content, 'danger', timeout)
    }

    return {
        AlertArea: AlertArea
    }


})
