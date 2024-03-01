
import * as build from "./build.js";
import fs from "fs";
import path from "path";
import process from "process";
import { version as ver } from "./version.js";

var verboselog = true;

export const color = { red: "\x1b[91m", green: "\x1b[92m", yellow: "\x1b[93m", blue: "\x1b[94m", magenta: "\x1b[95m", cyan: "\x1b[96m", reset: "\x1b[0m", white: "\x1b[97m" };
export const colors = [color.red, color.green, color.yellow, color.blue, color.magenta, color.cyan];

// TODO: find a neater way instead 2 arrays for itterating over
export var config = { dist: "public", src: "src", assets: "assets", systems: "systems" };
export var configData = [config.dist, config.src, config.assets, config.systems];

export const commands = [
    { "name": "dist", "description": "The directory to output the build files to", "type": "config", "default": "./public", "function": null },
    { "name": "help", "description": "Show this help message", "type": "command", "default": false, "function": help },
    { "name": "new", "description": "Create a new project at the path", "type": "command", "default": false, "function": project },
    { "name": "dev", "description": "Start development mode", "type": "command", "default": false, "function": watch },
    { "name": "build", "description": "Build the project", "type": "command", "default": false, "function": build.build },
    { "name": "version", "description": "Show the version number and exit", "type": "command", "default": false, "function": version },
    { "name": "setup", "description": "Setup a config file in the current directory", "type": "command", "default": false, "function": setup },
];

const newProject = [
    { "name": "magic.config", "type": "file", "content": dumpConfig },
    { "name": config.dist, "type": "dir" },
    { "name": config.assets, "type": "dir" },
    { "name": config.systems, "type": "dir" },
];


export async function parse(args) {
    if (args.length === 0) {
        help();
        return;
    }

    let command = commands.find(c => c.name === args[0]);
    if (command) {
        var options = args.slice(1);

        await command.function(options)

    } else {
        error("Command not found: " + args[0]);
        help();
    }
}

// TODO: move to watch.js
var watchers = [];
var watchInterval;
async function watch() {
    print("🔄   Starting development mode 🔥✨", color.white);

    for (let watcher of watchers) {
        watcher.close();
    }

    if (watchInterval) {
        clearInterval(watchInterval);
    }

    if (fs.existsSync(config.assets)) {
        watchers.push(fs.watch(config.assets, { recursive: true }, (eventType, filename) => {
            print("🔥  Asset changed: " + filename, color.yellow);
            build.build();
            console.log("🔥  Watching for changes...");
        }));
    } else {
        warn("No Assets directory found...");
    }

    if (fs.existsSync(config.systems)) {
        watchers.push(fs.watch(config.systems, { recursive: true }, (eventType, filename) => {
            print("🔥  System changed: " + filename, color.yellow);
            build.build();
            console.log("🔥  Watching for changes...");
        }));
    } else {
        warn("No Systems directory found...");
    }

    watchers.push(fs.watch("magic.config", (eventType, filename) => {
        console.log("🔄  " + color.green + `config changed ✨ Restarting... \n\n` + color.reset);
        load();
        watch();
        console.log("🔥  Watching for changes...");
    }));

    console.log("");
    console.log("🔥  Watching for changes...");

    watchInterval = await new Promise(() => {
        setInterval(() => { }, 1000);
    });
}

export function help() {
    console.log("\nUsage: magic [command] [options]\n");
    console.log("Magic commands:\n");
    var i = 0;
    for (let command of commands) {
        console.log(colors[i % colors.length] + ` ${command.name}  --` + color.reset + `  ${command.description}`);
        i += 1;
    }
}

export function dumpConfig() {
    var content = "";

    const len = Object.keys(config).length;
    var i = 0;
    for (const [key, value] of Object.entries(config)) {
        content += key + " " + value + (i < len - 1 ? "\n" : "");
        i += 1;
    }

    return content;
}

export function setup() {
    const config = dumpConfig();

    fs.writeFileSync("magic.config", config);

    sucess("Config file created at " + process.cwd());
    print("\nwith default options:", color.yellow);
    console.log(config);
}

export function project(path) {
    if (path.length === 0) {
        console.log("CLI: " + color.red + "No path provided!" + color.yellow + " usage: magic new <path>\n" + color.reset);
        return;
    }

    if (fs.existsSync(path[0])) {
        if (fs.readdirSync(path[0]).length > 0) {
            error("The directory is not empty");
        } else {
            error("The directory already exists");
        }

        process.exit(0);
    }

    print("Creating a new project at " + path[0], color.green);

    fs.mkdirSync(path[0], { recursive: true });

    for (let item of newProject) {

        if (item.type === "file") {
            fs.writeFileSync(path + "/" + item.name, item.content());
        }

        if (item.type === "dir") {
            fs.mkdirSync(path +
                "/" + item.name, { recursive: true });
        }

    }
}

var userInput = false;
async function promptNewProject() {
    warn("No magic.config file found in this directory...");
    console.log(color.cyan);
    console.log("✨   Would you like to create a new project here? (y/n) \n" + color.magenta + "     > " + process.cwd() + color.reset);

    process.stdin.on('data', function (data) {
        data = data.toString().trim();

        if (data === "y" || data === "yes" || data === "Y" || data === "Yes" || data === "tuta och kör") {
            process.stdin.end();
            project(process.cwd());
        }

        userInput = true;
    });

    while (!userInput) {
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

// Loads the config at the root of the project
export async function load() {

    const filePath = path.join(process.cwd(), "magic.config");

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return; // Assume default values
    }

    let data;
    try {
        data = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error("Error reading the file:", err);
        return;
    }

    const lines = data.split(/\r?\n/); // Handles both \n and \r\n

    for (let line of lines) {
        let parts = line.split(" ");
        let key = parts[0].trim();

        let value = parts.slice(1).join(" ").trim();

        config[key] = value;
    }
}

function todo() {
    print("TODO - not implemented yet ", color.red);
}

export function version() {
    console.log(ver);
}

export function print(message, colour) {
    if (!verboselog) return;
    console.log(colour + message + color.reset);
}

export function sucess(message) {
    console.log(color.green + "✅   " + message + color.reset);
}

export function warn(message) {
    console.log(color.yellow + "⚠️    " + message + color.reset);
}

export function error(message) {
    console.log(color.red + "🛑   Error: " + color.reset + message);
}