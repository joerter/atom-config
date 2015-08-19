var _ = require('lodash');
var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var Changes = require('./lib/apply-changes');
var code_actions_view_1 = require("../views/code-actions-view");
var CodeAction = (function () {
    function CodeAction() {
    }
    CodeAction.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(Omni.addTextEditorCommand("omnisharp-atom:get-code-actions", function () {
            //store the editor that this was triggered by.
            var editor = atom.workspace.getActiveTextEditor();
            Omni.request(editor, function (client) { return client.getcodeactions(_this.getRequest(client)); })
                .subscribe(function (response) {
                //pop ui to user.
                _this.view = code_actions_view_1["default"]({
                    items: response.CodeActions,
                    confirmed: function (item) {
                        var range = editor.getSelectedBufferRange();
                        Omni.request(editor, function (client) { return client.runcodeaction(_this.getRequest(client, item.Identifier)); })
                            .subscribe(function (response) { return _this.applyAllChanges(response.Changes); });
                    }
                }, editor);
            });
        }));
        this.disposable.add(Omni.activeEditor.where(function (editor) { return !!editor; }).subscribe(function (editor) {
            var cd = new rx_1.CompositeDisposable();
            cd.add(Omni.listener.observeGetcodeactions
                .where(function (z) { return z.request.FileName === editor.getPath(); })
                .where(function (ctx) { return ctx.response.CodeActions.length > 0; })
                .subscribe(function (_a) {
                var response = _a.response, request = _a.request;
                if (marker) {
                    marker.destroy();
                    marker = null;
                }
                var range = [[request.Line, 0], [request.Line, 0]];
                marker = editor.markBufferRange(range);
                editor.decorateMarker(marker, { type: "line-number", class: "quickfix" });
            }));
            cd.add(Omni.activeEditor.where(function (active) { return active !== editor; }).subscribe(function () {
                cd.dispose();
                _this.disposable.remove(cd);
            }));
            var word, marker, subscription;
            var makeLightbulbRequest = function (position) {
                if (subscription)
                    subscription.dispose();
                var range = editor.getSelectedBufferRange();
                subscription = Omni.request(function (client) { return client.getcodeactions(_this.getRequest(client), { silent: true }); })
                    .subscribe(function (response) {
                    if (response.CodeActions.length > 0) {
                        if (marker) {
                            marker.destroy();
                            marker = null;
                        }
                        var range = [[position.row, 0], [position.row, 0]];
                        marker = editor.markBufferRange(range);
                        editor.decorateMarker(marker, { type: "line-number", class: "quickfix" });
                    }
                });
            };
            var update = _.debounce(function (pos) {
                if (subscription)
                    subscription.dispose();
                makeLightbulbRequest(pos);
            }, 400);
            var onDidChangeCursorPosition = new rx_1.Subject();
            cd.add(onDidChangeCursorPosition);
            var onDidStopChanging = new rx_1.Subject();
            cd.add(onDidStopChanging);
            cd.add(rx_1.Observable.combineLatest(onDidChangeCursorPosition.debounce(100), onDidStopChanging.debounce(100), function (cursor, changing) { return cursor; })
                .debounce(200)
                .subscribe(function (cursor) { return update(cursor.newBufferPosition); }));
            cd.add(editor.onDidStopChanging(function () { return onDidStopChanging.onNext(true); }));
            cd.add(editor.onDidChangeCursorPosition(function (e) {
                var oldPos = e.oldBufferPosition;
                var newPos = e.newBufferPosition;
                var newWord = editor.getWordUnderCursor();
                if (word !== newWord || oldPos.row !== newPos.row) {
                    word = newWord;
                    if (marker) {
                        marker.destroy();
                        marker = null;
                    }
                }
                onDidChangeCursorPosition.onNext(e);
            }));
        }));
    };
    CodeAction.prototype.getRequest = function (client, codeAction) {
        var editor = atom.workspace.getActiveTextEditor();
        var range = editor.getSelectedBufferRange();
        var request = client.makeDataRequest({
            WantsTextChanges: true,
            Selection: {
                Start: {
                    Line: range.start.row,
                    Column: range.start.column
                },
                End: {
                    Line: range.end.row,
                    Column: range.end.column
                }
            }
        });
        if (codeAction !== undefined) {
            request.Identifier = codeAction;
        }
        return request;
    };
    CodeAction.prototype.dispose = function () {
        this.disposable.dispose();
    };
    CodeAction.prototype.applyAllChanges = function (changes) {
        return _.each(changes, function (change) {
            atom.workspace.open(change.FileName, undefined)
                .then(function (editor) { Changes.applyChanges(editor, change); });
        });
    };
    return CodeAction;
})();
exports.codeAction = new CodeAction;
