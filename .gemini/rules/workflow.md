---
description: Workflow instructions for building and committing changes.
---

# Workflow Guidelines

1. **Always Build After Changes**: After making any major code change, proactively run `npm run build` using the `run_command` tool to ensure the project still compiles correctly. Do not wait for the user to prompt you to do this.
2. **Commit Changes**: Once the changes are verified to compile and there are noticeable modifications, automatically commit the changes.
   - Use `git add` for the modified files.
   - Use `git commit -m "<message>"` with a clear, descriptive commit message explaining what was changed and why.
