var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var _ = require('lodash');
var rx_1 = require('rx');
var omnisharp_client_1 = require("omnisharp-client");
var view_model_1 = require("./view-model");
var Client = (function (_super) {
    __extends(Client, _super);
    function Client(options) {
        _super.call(this, options);
        this.temporary = false;
        this.configureClient();
        this.temporary = options.temporary;
        this.model = new view_model_1.ViewModel(this);
        this.path = options.projectPath;
        this.index = options['index'];
        this.repository = options.repository;
        this.setupRepository();
    }
    Client.prototype.toggle = function () {
        if (this.currentState === omnisharp_client_1.DriverState.Disconnected) {
            var path = atom && atom.project && atom.project.getPaths()[0];
            this.connect({
                projectPath: path
            });
        }
        else {
            this.disconnect();
        }
    };
    Client.prototype.connect = function (options) {
        if (this.currentState === omnisharp_client_1.DriverState.Connected || this.currentState === omnisharp_client_1.DriverState.Connecting || this.currentState === omnisharp_client_1.DriverState.Error)
            return;
        _super.connect.call(this, options);
        this.log("Starting OmniSharp server (pid:" + this.id + ")");
        this.log("OmniSharp Location: " + this.serverPath);
        this.log("Change the location that OmniSharp is loaded from by setting the OMNISHARP environment variable");
        this.log("OmniSharp Path: " + this.projectPath);
    };
    Client.prototype.disconnect = function () {
        _super.disconnect.call(this);
        this.log("Omnisharp server stopped.");
    };
    Client.prototype.getEditorContext = function (editor) {
        editor = editor || atom.workspace.getActiveTextEditor();
        if (!editor) {
            return;
        }
        var marker = editor.getCursorBufferPosition();
        var buffer = editor.getBuffer().getLines().join('\n');
        return {
            Column: marker.column,
            FileName: editor.getURI(),
            Line: marker.row,
            Buffer: buffer
        };
    };
    Client.prototype.makeRequest = function (editor, buffer) {
        editor = editor || atom.workspace.getActiveTextEditor();
        // TODO: update and add to typings.
        if (_.has(editor, 'alive') && !editor.alive) {
            return { abort: true };
        }
        buffer = buffer || editor.getBuffer();
        var bufferText = buffer.getLines().join('\n');
        var marker = editor.getCursorBufferPosition();
        return {
            Column: marker.column,
            FileName: editor.getURI(),
            Line: marker.row,
            Buffer: bufferText
        };
    };
    Client.prototype.makeDataRequest = function (data, editor, buffer) {
        return _.extend(data, this.makeRequest(editor, buffer));
    };
    Client.prototype.configureClient = function () {
        this.logs = this.events.map(function (event) { return ({
            message: event.Body && event.Body.Message || event.Event || '',
            logLevel: event.Body && event.Body.LogLevel || (event.Type === "error" && 'ERROR') || 'INFORMATION'
        }); });
        this.errors.subscribe(function (exception) {
            console.error(exception);
        });
        this.responses.subscribe(function (data) {
            if (atom.config.get('omnisharp-atom.developerMode')) {
                console.log("omni:" + data.command, data.request, data.response);
            }
        });
    };
    Client.prototype.request = function (action, request, options) {
        // Custom property that we set inside make request if the editor is no longer active.
        if (request['abort']) {
            return rx_1.Observable.empty();
        }
        var tempR = request;
        if (tempR && _.endsWith(tempR.FileName, '.json')) {
            tempR.Buffer = null;
        }
        return omnisharp_client_1.OmnisharpClientV2.prototype.request.call(this, action, request, options);
    };
    Client.prototype.setupRepository = function () {
        var _this = this;
        if (this.repository) {
            var branchSubject = new rx_1.Subject();
            branchSubject
                .distinctUntilChanged()
                .subscribe(function () { return atom.commands.dispatch(atom.views.getView(atom.workspace), 'omnisharp-atom:restart-server'); });
            this.repository.onDidChangeStatuses(function () {
                branchSubject.onNext(_this.repository['branch']);
            });
        }
    };
    return Client;
})(omnisharp_client_1.OmnisharpClientV2);
// Hack to workaround issue with ts.transpile not working correctly
(function (Client) {
    Client.connect = Client.prototype.connect;
    Client.disconnect = Client.prototype.disconnect;
})(omnisharp_client_1.OmnisharpClientV2);
module.exports = Client;
