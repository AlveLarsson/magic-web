import * as log from "./log.js";
import * as settings from "./settings.js";
import * as user from "./user.js";
import * as watch from "./watch.js";

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export const BUNDLE_ROOT = "bundle.js";
export var minify = true;

export function bundle(args) {

    const bundleFile = settings.projectPath;

    if (!settings.isValidProject(bundleFile)) {
        log.error("Not a valid project directory");
        process.exit(1);
    }

    var buffer = "📦   Bundling project...\n";

    log.write(buffer);
    log.flush();

    /*
    if (user.config.bundler === "?") {
        if (!findBundler()) {
            log.error("No bundler found");
            process.exit(1);
        }
    }*/

    generateBundleRoot();

    if (user.config.bundler !== "bun") {
        log.error("Bun is the only supported bundler at the moment");
        process.exit(1);
    }

    var result = true;

    result = bunBundle();

    return result;
}

// Finds the bundler and deafults it to the user file
// Returns true if a bundler has been found
export function findBundler() {

    // Check if we have bun bun
    return false
}

export function rootFileContent() {

    var buffer = "// ✨ AUTO GENERATED BY MAGIC -- DO NOT EDIT ✨\n\n";

    var modulePath = path.join(process.cwd(), "node_modules/magic-framework/index.ts");

    if (!settings.development_mode) {
        if (!fs.existsSync(modulePath)) {

            var modulePath = path.join(settings.projectPath, "node_modules/magic-framework/index.js");

            if (!fs.existsSync(modulePath)) {
                log.error("No magic-framework module found!  Did you initialize the project? ");
                process.exit(1);
            }
        }
    } else {
        minify = false;
        buffer += "// Development mode\nwindow.magic_dev = true;\n";

        modulePath = path.join(process.cwd(), "index.ts");
        modulePath = modulePath.replace(/\\/g, "\\\\");
    }

    // Add the Magic import to the path
    buffer += `import "${modulePath}";\n`;

    if (settings.watchMode) {
        buffer += "const MAGIC_PORT = " + settings.config.port + ";\n";

        buffer += watch.CLIENT_WATCHER + "\n";
        // inline the dev.js file next to this file
        buffer += fs.readFileSync(path.join(__dirname, "dev.js"), "utf8");
    }

    // Find index.js/ts and import it in the settings.config.src folder
    const index = path.join(process.cwd(), settings.projectPath, settings.config.src, settings.config.entry);

    if (fs.existsSync(index)) {
        buffer += `\n// Consumer lib\nimport "${index}";\n`;
    } else {
        log.error("No entry file found in the src folder");
        process.exit(1);
    }

    return buffer;
}

// Generates the root file the bundler is pointed to in the cli
// this includes all the parts of the project that's needed
export function generateBundleRoot() {

    const rootFile = path.join(settings.projectPath, settings.MAGIC_DIR, BUNDLE_ROOT);
    log.write("Generating bundle root file: " + rootFile + "\n");

    fs.writeFileSync(rootFile, rootFileContent());

}

export async function bunBundle() {
    const entry = path.join(process.cwd(), settings.projectPath, settings.MAGIC_DIR, BUNDLE_ROOT);
    const out = path.join(process.cwd(), settings.projectPath, settings.config.dist);

    const res = await Bun.build({
        entrypoints: [entry],
        outdir: out,
        minify: minify,
        target: 'browser'
    });

    if (!res.success) {
        console.log(res.logs);
        return res.logs;
    }

    return null;
}