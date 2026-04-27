# narrate shell aliases — source this from ~/.zshrc or ~/.bashrc
#
#   source /path/to/narrate/integrations/shell/aliases.sh
#

# Quick voice with a preset
say-r()  { narrate --voice researcher "$@"; }
say-e()  { narrate --voice engineer   "$@"; }
say-a()  { narrate --voice architect  "$@"; }
say-d()  { narrate --voice designer   "$@"; }

# Pipe-friendly: narrate the output of a long-running command
narrate-when-done() {
    "$@"
    local code=$?
    if [ $code -eq 0 ]; then
        narrate --quiet "Command completed successfully"
    else
        narrate --quiet "Command failed with code $code"
    fi
    return $code
}

# Read a file aloud
narrate-file() {
    [ -f "$1" ] || { echo "no such file: $1" >&2; return 1; }
    cat "$1" | narrate
}
