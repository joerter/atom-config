var rx_1 = require("rx");
var Omni = require('../../omni-sharp-server/omni');
var lodash_1 = require("lodash");
var child_process_1 = require("child_process");
var command_output_window_1 = require('../views/command-output-window');
var readline = require("readline");
var dock_1 = require("../atom/dock");
var path_1 = require("path");
var win32 = process.platform === "win32";
var daemonFlags = ['--server Kestrel', '--server Microsoft.AspNet.Server.WebListener'];
if (win32) {
    var inactiveCommands = ['--server Kestrel'];
    var env = {};
}
else {
    var inactiveCommands = ['--server Microsoft.AspNet.Server.WebListener'];
    var env = process.env;
}
var CommandRunner = (function () {
    function CommandRunner() {
        this._projectMap = new WeakMap();
        this._watchProcesses = [];
    }
    Object.defineProperty(CommandRunner.prototype, "processes", {
        get: function () { return this._watchProcesses; },
        enumerable: true,
        configurable: true
    });
    CommandRunner.prototype.activate = function () {
        var _this = this;
        this.disposable = new rx_1.CompositeDisposable();
        this.disposable.add(rx_1.Disposable.create(function () { return _this._projectMap.clear(); }));
        this.disposable.add(Omni.listener.model.projectAdded
            .subscribe(function (project) { return _this.addCommands(project); }));
        this.disposable.add(Omni.listener.model.projectChanged
            .subscribe(function (project) {
            var cd = _this._projectMap.get(project);
            if (cd) {
                cd.dispose();
                _this._projectMap.delete(project);
                _this.addCommands(project);
            }
        }));
        this.disposable.add(Omni.listener.model.projectRemoved
            .subscribe(function (project) {
            var cd = _this._projectMap.get(project);
            if (cd) {
                cd.dispose();
                _this._projectMap.delete(project);
            }
        }));
        var processes = this._processesChanged = new rx_1.Subject();
        this.observe = { processes: processes };
    };
    CommandRunner.prototype.addCommands = function (project) {
        var _this = this;
        if (lodash_1.any(project.commands)) {
            var cd = new rx_1.CompositeDisposable();
            this._projectMap.set(project, cd);
            this.disposable.add(cd);
            lodash_1.each(project.commands, function (content, command) {
                if (!lodash_1.any(inactiveCommands, function (cnt) { return lodash_1.contains(content, cnt); })) {
                    cd.add(_this.addCommand(project, command, content));
                }
            });
        }
    };
    CommandRunner.prototype.addCommand = function (project, command, content) {
        var _this = this;
        //--server Kestrel
        //--server Microsoft.AspNet.Server.WebListener
        var daemon = lodash_1.any(daemonFlags, function (cnt) { return lodash_1.contains(content, cnt); });
        if (daemon) {
            return atom.commands.add('atom-workspace', "omnisharp-dnx:" + project.name + "-[" + command + "]-(watch)", function () { return _this.daemonProcess(project, command); });
        }
        else {
            return atom.commands.add('atom-workspace', "omnisharp-dnx:" + project.name + "-[" + command + "]", function () { return _this.runProcess(project, command); });
        }
    };
    CommandRunner.prototype.daemonProcess = function (project, command) {
        var _this = this;
        var process = new RunProcess(project, command, true);
        this._watchProcesses.push(process);
        this._processesChanged.onNext(this.processes);
        process.disposable.add(rx_1.Disposable.create(function () {
            lodash_1.pull(_this._watchProcesses, process);
            _this._processesChanged.onNext(_this.processes);
        }));
        var objectChanges = rx_1.Observable.ofObjectChanges(process).where(function (z) { return z.name === 'started'; });
        process.disposable.add(objectChanges.where(function (z) { return z.object.started; }).delay(1000).subscribe(function () { return _this._processesChanged.onNext(_this.processes); }));
        process.disposable.add(objectChanges.where(function (z) { return !z.object.started; }).subscribe(function () { return _this._processesChanged.onNext(_this.processes); }));
        process.start();
    };
    CommandRunner.prototype.runProcess = function (project, command) {
        var process = new RunProcess(project, command);
        process.start();
    };
    CommandRunner.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return CommandRunner;
})();
var RunProcess = (function () {
    function RunProcess(project, command, watch) {
        if (watch === void 0) { watch = false; }
        this.project = project;
        this.command = command;
        this.watch = watch;
        this.disposable = new rx_1.CompositeDisposable();
        this.update = new rx_1.Subject();
        this.output = [];
        this.started = false;
        this.id = "" + this.project.name + this.command;
        this.disposable.add(dock_1.dock.addWindow(this.id, this.project.name + " " + (this.watch ? '--watch' : '') + " " + this.command, command_output_window_1.CommandOutputWindow, this, {
            closeable: true,
            priority: 1001
        }, this.disposable));
    }
    RunProcess.prototype.start = function () {
        var _this = this;
        var solution = Omni.getClientForProject(this.project)
            .map(function (solution) { return solution.model.dnx.RuntimePath + (win32 ? '/bin/dnx.exe' : '/bin/dnx'); })
            .map(path_1.normalize)
            .tapOnNext(function () { return dock_1.dock.selectWindow(_this.id); })
            .subscribe(function (runtime) { return _this.bootRuntime(runtime); });
    };
    RunProcess.prototype.bootRuntime = function (runtime) {
        var _this = this;
        var args = ['.', this.command];
        var failed = false;
        if (this.watch) {
            args.unshift('--watch');
        }
        this.output.push({ message: "Starting " + runtime + " " + args.join(' ') });
        this.started = true;
        var process = child_process_1.spawn(runtime, args, {
            cwd: this.project.path,
            env: env,
            stdio: 'pipe'
        });
        var out = readline.createInterface({
            input: process.stdout,
            output: undefined
        });
        out.on('line', function (data) {
            _this.output.push({ message: data });
            _this.update.onNext(_this.output);
        });
        var error = readline.createInterface({
            input: process.stderr,
            output: undefined
        });
        error.on('line', function (data) {
            _this.output.push({ message: data });
            _this.update.onNext(_this.output);
        });
        var disposable = rx_1.Disposable.create(function () {
            _this.started = false;
            process.removeAllListeners();
            try {
                process.kill();
            }
            catch (e) { }
        });
        this.disposable.add(disposable);
        var cb = function () {
            _this.started = false;
            disposable.dispose();
            if (_this.watch && !failed)
                _this.bootRuntime(runtime);
        };
        if (this.watch) {
            process.on('close', cb);
            process.on('exit', cb);
            process.on('disconnect', cb);
        }
    };
    RunProcess.prototype.dispose = function () {
        this.disposable.dispose();
    };
    return RunProcess;
})();
exports.RunProcess = RunProcess;
exports.commandRunner = new CommandRunner;
