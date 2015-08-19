var rx_1 = require("rx");
var StatusBarComponent = require('../views/status-bar-view');
var React = require('react');
var StatusBar = (function () {
    function StatusBar() {
        this._active = false;
    }
    StatusBar.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(rx_1.Disposable.create(function () { return _this._active = false; }));
    };
    StatusBar.prototype.setup = function (statusBar) {
        this.statusBar = statusBar;
        if (this._active) {
            this._attach();
        }
    };
    StatusBar.prototype.attach = function () {
        if (this.statusBar) {
            this._attach();
        }
        this._active = true;
    };
    StatusBar.prototype._attach = function () {
        var _this = this;
        this.view = document.createElement("span");
        var tile = this.statusBar.addLeftTile({
            item: this.view,
            priority: -10000
        });
        this.disposable.add(rx_1.Disposable.create(function () {
            React.unmountComponentAtNode(_this.view);
            tile.destroy();
            _this.view.remove();
        }));
        React.render(React.createElement(StatusBarComponent, {}), this.view);
    };
    StatusBar.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return StatusBar;
})();
exports.statusBar = new StatusBar;
