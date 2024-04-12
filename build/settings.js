import * as build from "./build.js";
import * as bundle from "./bundle.js";
import * as log from "./log.js";
import * as user from "./user.js";

import fs from "fs";
import path from "path";
import process from "process";
import { VERSION } from "./version.js";
import * as watch from "./watch.js";

export var projectPath = "";
export var development_mode = false;
export var watchMode = false;

export const CONFIG_PATH = "magic.config";
export const MAGIC_DIR = ".magic";
export const validCWD = isValidProject(".");
export const COMMAND_SPACING = 20;

// TODO: find a neater way instead 2 arrays for itterating over
export var config = {
    dist: "dist",
    src: "src",
    assets: "assets",
    entry: "index.ts",
    port: "2370",
};

export const ASSET_TYPES = [
    'mesh',
    'textures',
    'sound',
];

export const COMMANDS = [
    // Info
    { type: "info", name: "help", function: help, description: "Show this help message" },
    { type: "info", name: "version", function: version, description: "Show the version number and exit" },

    // Project actions
    // takes path expects the next argument
    { type: "act", name: "new", function: project, description: "Create a new project at the path" },
    { type: "act", name: "dev", function: watch.watch, description: "Start development mode" },
    { type: "act", name: "build", function: build.build, description: "Build the project" },
    { type: "act", name: "setup", function: setup, description: "Setup a config file in the current directory" },
    { type: "act", name: "bundle", function: bundle.bundle, description: "Bundle the project" },

    // User config
    // { type: "flag", name: "s", description: "Disable verbose logging", function: () => { log.verbose = false; } },
    // { type: "flag", name: "debug", description: "Enable debugging mode", function: () => { log.verbose = false; } },
];

const PROJECT_STRUCTURE = [
    { type: "dir", name: config.src },
    { type: "dir", name: config.dist },
    { type: "dir", name: config.assets },
    ...genAssetSubDirs(),
    { type: "dir", name: MAGIC_DIR },
    { type: "file", name: CONFIG_PATH, content: dumpConfig(config) },
    { type: "file", name: ".gitignore", content: MAGIC_DIR },
    { type: "file", name: user.CONFIG_PATH, content: dumpConfig(user.config) },
];

function genAssetSubDirs() {
    var content = []
    for (let type of ASSET_TYPES) {
        content.push({ type: "dir", name: `${config.assets}/${type}` })
    };

    return content;
}

export function parse(args) {
    if (args.length === 0) return null;
    
    var action = null;

    for (let argument of args) {
        for (let command of COMMANDS) {
            if (argument === command.name) {
                action = command.function;
                args.shift();
                
                if(command.type === "act") {
                    projectPath = args[0];
                    args.shift();
                }
            
                break;
            }
        }
    }

    return { function: action, arguments: args };
}

// Loads the config at the root of the project
export function load() {
    const filePath = path.join(projectPath, CONFIG_PATH);

    if (!fs.existsSync(filePath)) {
        return;
    }

    config = loadConfig(filePath);
}


export function help() {
    var buffer = "Usage: magic [command] [options]\n\nMagic commands:\n\n";

    var i = 0;
    for (let command of COMMANDS) {
        buffer += `${log.COLORS[i % log.COLORS.length]}${command.name} ${log.RESET}`.padEnd(COMMAND_SPACING) + `-- ${command.description}\n`;
        i += 1;
    }

    log.write(buffer);
}

export function dumpConfig(data) {
    var content = "";

    const len = Object.keys(data).length;
    var i = 0;
    for (const [key, value] of Object.entries(data)) {
        content += key + " " + value + (i < len - 1 ? "\n" : "");
        i += 1;
    }

    return content;
}

export function setup() {
    const buffer = dumpConfig(config);

    fs.writeFileSync(CONFIG_PATH, buffer);

    log.success("Config file created at " + projectPath);
    log.print("\nwith default options:", log.YELLOW);
}

export function project(path) {

    if (path.length === 0) {
        path[0] = process.cwd();
    }

    if (fs.existsSync(path[0])) {
        if (fs.readdirSync(path[0]).length > 0) {
            log.error("The directory is not empty");
        } else {
            log.error("The directory already exists");
        }

        return;
    }

    log.print("Creating a new project at " + path[0], log.GREEN);

    fs.mkdirSync(path[0], { recursive: true });

    for (let item of PROJECT_STRUCTURE) {

        if (item.type === "file") {
            fs.writeFileSync(path + "/" + item.name, item.content);
        }

        if (item.type === "dir") {
            fs.mkdirSync(path +
                "/" + item.name, { recursive: true });
        }

    }
}

function promptNewProject() {
    log.warn("No magic.config file found in this directory...");
    log.print("✨   Would you like to create a new project here? (y/n)" + log.MAGENTA + "     > " + projectPath, log.CYAN);
    log.flush();

    var userInput = false;

    process.stdin.on('data', function (data) {
        data = data.toString().trim();

        if (data === "y" || data === "yes" || data === "Y" || data === "Yes") {
            process.stdin.end();
            project(projectPath);
        }

        userInput = true;
    });

    while (!userInput) {
        setTimeout(resolve, 300);
    }
}

export function isValidProject(project) {
    const config = path.join(process.cwd(), project, CONFIG_PATH);

    if (!fs.existsSync(config)) return false;

    const magicDir = path.join(process.cwd(), project, MAGIC_DIR);

    if (!fs.existsSync(magicDir)) {
        log.write("Initializing magic directory...");

        fs.mkdirSync(magicDir, { recursive: true });
    }

    return true;
}

export function loadConfig(p) {
    let data;
    try {
        data = fs.readFileSync(p, 'utf8');
    } catch (err) {
        log.error("ON CONFIG LOAD: " + p + " 🛑  Error reading the file: " + err);
        return;
    }

    var output = {};

    const lines = data.split(/\r?\n/); // Handles both \n and \r\n

    for (let line of lines) {
        let parts = line.split(" ");
        let key = parts[0].trim();

        let value = parts.slice(1).join(" ").trim();

        output[key] = value;
    }

    return output;
}


export function version() {
    log.print(VERSION);
}

export function devMode() {
    development_mode = true;
}

export function triggerWatchMode() {
    watchMode = true;
}