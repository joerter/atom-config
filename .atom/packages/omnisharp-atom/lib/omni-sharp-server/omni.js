var rx_1 = require('rx');
var manager = require("./client-manager");
var _ = require('lodash');
var path_1 = require("path");
var omnisharp_client_1 = require("omnisharp-client");
var Omni = (function () {
    function Omni() {
        this._activeEditorSubject = new rx_1.BehaviorSubject(null);
        this._activeEditor = this._activeEditorSubject.shareReplay(1).asObservable();
        this._activeConfigEditorSubject = new rx_1.BehaviorSubject(null);
        this._activeConfigEditor = this._activeConfigEditorSubject.shareReplay(1).asObservable();
        this._activeProject = rx_1.Observable.combineLatest(this._activeEditorSubject, this._activeConfigEditorSubject, function (editor, config) { return editor || config || null; })
            .debounce(10)
            .asObservable()
            .flatMap(function (editor) { return manager.getClientForEditor(editor)
            .flatMap(function (z) { return z.model.getProjectForEditor(editor); }); })
            .shareReplay(1);
        this._activeFramework = rx_1.Observable.combineLatest(this._activeEditorSubject, this._activeConfigEditorSubject, function (editor, config) { return editor || config || null; })
            .debounce(10)
            .asObservable()
            .flatMapLatest(function (editor) { return manager.getClientForEditor(editor)
            .flatMapLatest(function (z) { return z.model.getProjectForEditor(editor); }); })
            .flatMapLatest(function (project) { return project.observe.activeFramework.map(function (framework) { return ({ project: project, framework: framework }); }); })
            .shareReplay(1);
        this._isOff = true;
    }
    Object.defineProperty(Omni.prototype, "isOff", {
        get: function () { return this._isOff; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "isOn", {
        get: function () { return !this.isOff; },
        enumerable: true,
        configurable: true
    });
    Omni.prototype.activate = function () {
        var _this = this;
        var openerDisposable = makeOpener();
        this.disposable = new rx_1.CompositeDisposable;
        manager.activate(this._activeEditor);
        // we are only off if all our clients are disconncted or erroed.
        this.disposable.add(manager.combinationClient.state.subscribe(function (z) { return _this._isOff = _.all(z, function (x) { return x.value === omnisharp_client_1.DriverState.Disconnected || x.value === omnisharp_client_1.DriverState.Error; }); }));
        this._editors = Omni.createTextEditorObservable(['C#', 'C# Script File'], this.disposable);
        this._configEditors = Omni.createTextEditorObservable(['JSON'], this.disposable);
        this.disposable.add(atom.workspace.observeActivePaneItem(function (pane) {
            if (pane && pane.getGrammar) {
                var grammar = pane.getGrammar();
                if (grammar) {
                    var grammarName = grammar.name;
                    if (grammarName === 'C#' || grammarName === 'C# Script File') {
                        _this._activeConfigEditorSubject.onNext(null);
                        _this._activeEditorSubject.onNext(pane);
                        return;
                    }
                    var filename = path_1.basename(pane.getPath());
                    if (filename === 'project.json') {
                        _this._activeEditorSubject.onNext(null);
                        _this._activeConfigEditorSubject.onNext(pane);
                        return;
                    }
                }
            }
            // This will tell us when the editor is no longer an appropriate editor
            _this._activeEditorSubject.onNext(null);
            _this._activeConfigEditorSubject.onNext(null);
        }));
        this.disposable.add(rx_1.Disposable.create(function () {
            _this._activeEditorSubject.onNext(null);
            _this._activeConfigEditorSubject.onNext(null);
        }));
    };
    Omni.prototype.deactivate = function () {
        this.disposable.dispose();
        manager.deactivate();
    };
    Omni.prototype.connect = function () { manager.connect(); };
    Omni.prototype.disconnect = function () { manager.disconnect(); };
    Omni.prototype.toggle = function () {
        if (manager.connected) {
            manager.disconnect();
        }
        else {
            manager.connect();
        }
    };
    Omni.prototype.navigateTo = function (response) {
        atom.workspace.open(response.FileName, { initialLine: response.Line, initialColumn: response.Column })
            .then(function (editor) {
            editor.setCursorBufferPosition([response.Line && response.Line, response.Column && response.Column]);
        });
    };
    Omni.prototype.getFrameworks = function (projects) {
        var frameworks = _.map(projects, function (project) {
            return project.indexOf('+') === -1 ? '' : project.split('+')[1];
        }).filter(function (fw) { return fw.length > 0; });
        return frameworks.join(',');
    };
    Omni.prototype.addTextEditorCommand = function (commandName, callback) {
        return atom.commands.add("atom-text-editor", commandName, function (event) {
            var editor = atom.workspace.getActiveTextEditor();
            if (!editor) {
                return;
            }
            ;
            var grammarName = editor.getGrammar().name;
            if (grammarName === 'C#' || grammarName === 'C# Script File') {
                event.stopPropagation();
                event.stopImmediatePropagation();
                callback(event);
            }
        });
    };
    Omni.createTextEditorObservable = function (grammars, disposable) {
        var editors = [];
        var subject = new rx_1.Subject();
        disposable.add(subject);
        var editorSubject = new rx_1.Subject();
        disposable.add(editorSubject);
        disposable.add(atom.workspace.observeActivePaneItem(function (pane) { return editorSubject.onNext(pane); }));
        var editorObservable = editorSubject.where(function (z) { return z && !!z.getGrammar; });
        disposable.add(rx_1.Observable.zip(editorObservable, editorObservable.skip(1), function (editor, nextEditor) { return ({ editor: editor, nextEditor: nextEditor }); })
            .debounce(50)
            .subscribe(function (_a) {
            var editor = _a.editor, nextEditor = _a.nextEditor;
            var path = nextEditor.getPath();
            if (!path) {
                // editor isn't saved yet.
                if (editor && _.contains(grammars, editor.getGrammar().name)) {
                    atom.notifications.addInfo("OmniSharp", { detail: "Functionality will limited until the file has been saved." });
                }
            }
        }));
        disposable.add(atom.workspace.observeTextEditors(function (editor) {
            function cb() {
                editors.push(editor);
                subject.onNext(editor);
                // pull old editors.
                disposable.add(editor.onDidDestroy(function () { return _.pull(editors, editor); }));
            }
            var editorFilePath;
            if (editor.getGrammar) {
                var s = editor.observeGrammar(function (grammar) {
                    var grammarName = editor.getGrammar().name;
                    if (_.contains(grammars, grammarName)) {
                        var path = editor.getPath();
                        if (!path) {
                            // editor isn't saved yet.
                            var sub = editor.onDidSave(function () {
                                if (editor.getPath()) {
                                    _.defer(function () {
                                        cb();
                                        s.dispose();
                                    });
                                }
                                sub.dispose();
                            });
                            disposable.add(sub);
                        }
                        else {
                            _.defer(function () {
                                cb();
                                s.dispose();
                            });
                        }
                    }
                });
                disposable.add(s);
            }
        }));
        return rx_1.Observable.merge(subject, rx_1.Observable.defer(function () { return rx_1.Observable.from(editors); }));
    };
    Object.defineProperty(Omni.prototype, "listener", {
        /**
        * This property can be used to listen to any event that might come across on any clients.
        * This is a mostly functional replacement for `registerConfiguration`, though there has been
        *     one place where `registerConfiguration` could not be replaced.
        */
        get: function () {
            return manager.observationClient;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "combination", {
        /**
        * This property can be used to observe to the aggregate or combined responses to any event.
        * A good example of this is, for code check errors, to aggregate all errors across all open solutions.
        */
        get: function () {
            return manager.combinationClient;
        },
        enumerable: true,
        configurable: true
    });
    Omni.prototype.request = function (editor, callback) {
        if (_.isFunction(editor)) {
            callback = editor;
            editor = null;
        }
        if (!editor) {
            editor = atom.workspace.getActiveTextEditor();
        }
        var clientCallback = function (client) {
            var r = callback(client);
            if (rx_1.helpers.isPromise(r)) {
                return rx_1.Observable.fromPromise(r);
            }
            else {
                return r;
            }
        };
        var result;
        if (editor) {
            result = manager.getClientForEditor(editor)
                .where(function (z) { return !!z; })
                .flatMap(clientCallback).share();
        }
        else {
            result = manager.activeClient.take(1)
                .where(function (z) { return !!z; })
                .flatMap(clientCallback).share();
        }
        // Ensure that the underying promise is connected
        //   (if we don't subscribe to the reuslt of the request, which is not a requirement).
        result.subscribeOnCompleted(function () { });
        return result;
    };
    Omni.prototype.getProject = function (editor) {
        return manager.getClientForEditor(editor)
            .flatMap(function (z) { return z.model.getProjectForEditor(editor); })
            .take(1);
    };
    Omni.prototype.getClientForProject = function (project) {
        return rx_1.Observable.from(manager.activeClients)
            .where(function (solution) { return _.any(solution.model.projects, function (p) { return p === project; }); })
            .take(1);
    };
    Object.defineProperty(Omni.prototype, "activeModel", {
        /**
        * Allows for views to observe the active model as it changes between editors
        */
        get: function () {
            return manager.activeClient.map(function (z) { return z.model; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "activeEditor", {
        get: function () {
            return this._activeEditor;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "activeConfigEditor", {
        get: function () {
            return this._activeConfigEditor;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "activeProject", {
        get: function () {
            return this._activeProject;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "activeFramework", {
        get: function () {
            return this._activeFramework;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "editors", {
        get: function () {
            return this._editors;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Omni.prototype, "configEditors", {
        get: function () {
            return this._configEditors;
        },
        enumerable: true,
        configurable: true
    });
    Omni.prototype.registerConfiguration = function (callback) {
        manager.registerConfiguration(callback);
    };
    return Omni;
})();
var instance = new Omni;
var atom_1 = require("atom");
var metadataUri = 'omnisharp://metadata/';
function makeOpener() {
    function createEditorView(assemblyName, typeName) {
        function issueRequest(solution) {
            return solution.request("metadata", { AssemblyName: assemblyName, TypeName: typeName })
                .map(function (response) { return ({ source: response.Source, path: response.SourceName, solution: solution }); });
        }
        function setupEditor(_a) {
            var solution = _a.solution, path = _a.path, source = _a.source;
            var editor = new atom_1.TextEditor({});
            editor.setText(source);
            editor.onWillInsertText(function (e) { return e.cancel(); });
            editor.getBuffer().setPath(path);
            editor.omniProject = solution.path;
            editor.__omniClient__ = solution;
            editor.save = function () { };
            editor.saveAs = function () { };
            return editor;
        }
        return manager.activeClient
            .take(1)
            .flatMap(issueRequest)
            .map(setupEditor)
            .toPromise();
    }
    return atom.workspace.addOpener(function (uri) {
        if (_.startsWith(uri, metadataUri)) {
            var url = uri.substr(metadataUri.length);
            var _a = url.split('/'), assemblyName = _a[0], typeName = _a[1];
            return createEditorView(assemblyName, typeName);
        }
    });
}
module.exports = instance;
