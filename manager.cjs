const { exec } = require("child_process")

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, { shell: true }, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Error occurred: ${error.message}`)
                if (stderr) {
                    console.log(`Standard Error: ${stderr.trim()}`)
                }
                return resolve(false)
            }
            if (stdout) {
                console.log(stdout.trim())
            }
            resolve(true)
        })
    })
}

async function publishAndPushOperations(packageManager, command) {
    console.log("Switching to main branch...")
    if (!await runCommand("git checkout main")) {
        process.exit(1)
    }

    console.log("Merging dev branch into main...")
    if (!await runCommand("git merge dev")) {
        console.log("❌ Merge conflict occurred. Please resolve it manually.")
        process.exit(1)
    }

    console.log("Pushing changes to GitHub...")
    if (!await runCommand("git push origin main")) {
        console.log("❌ Failed to push changes to GitHub. Please check your network connection and permissions.")
        process.exit(1)
    }

    console.log("✅ Successfully merged 'dev' into 'main' and pushed to GitHub!")

    if (command === "publish") {
        console.log(`Publishing package (${packageManager} publish)...`)
        if (!await runCommand(`${packageManager} publish`)) {
            console.log(`❌ ${packageManager} publish command failed.`)
            process.exit(1)
        }
    }

    console.log("Switching back to dev branch...")
    if (!await runCommand("git checkout dev")) {
        console.log("❌ Failed to switch back to the 'dev' branch.")
        process.exit(1)
    }

    console.log("✅ All operations completed.")
}

const packageManagerArg = process.argv[2]
const commandArg = process.argv[3]

const validManagers = ["pnpm", "npm", "yarn", "bun"]
const validCommands = ["push", "publish"]

if (!validManagers.includes(packageManagerArg) || !validCommands.includes(commandArg)) {
    console.log(`Invalid or missing arguments. Usage: node manager.cjs <package-manager> <push|publish>\nValid package managers: ${validManagers.join(", ")}`)
    process.exit(1)
}

publishAndPushOperations(packageManagerArg, commandArg)
