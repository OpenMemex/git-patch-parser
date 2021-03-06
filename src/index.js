const HUNK_REGEX = /@@ -([0-9])*,([0-9])* \+([0-9])*,([0-9])* @@/;

export default function parsePatch(patch) {
    const lines = patch.split('\n');

    let files = [];
    let hunk = null;
    let file = null;
    let headerType = 0;
    let sourceLine;
    let targetLine;
    lines.forEach((line) => {
        if (line.startsWith('diff --git ')) {
            if (file) {
                files.push(file);
            }

            file = {};
            headerType = 1;
        }

        if (headerType === 1 && line.startsWith('index ')) {
            headerType = 2;
        }

        if (headerType === 2 && line.startsWith('--- ')) {
            headerType = 3;

            if (line.substring(4) !== '/dev/null') {
                file.source = line.substring(4);
            } else {
                file.source = null;
            }
        }

        if (headerType === 3 && line.startsWith('+++ ')) {
            headerType = 4;

            if (line.substring(4) !== '/dev/null') {
                file.target = line.substring(4);
            } else {
                file.target = null;
            }
        }

        if ((headerType === 4 || headerType === 5) && line.startsWith('@@')) {
            const match = line.match(HUNK_REGEX);
            if (match) {
                if (hunk) {
                    file.hunks = file.hunks || [];
                    file.hunks.push(hunk);
                }

                const sourceFromLine = parseInt(match[1], 10);
                const sourceToLine = parseInt(match[2], 10);
                const targetFromLine = parseInt(match[3], 10);
                const targetToLine = parseInt(match[4], 10);

                hunk = {
                    source: {
                        from: sourceFromLine,
                        to: sourceToLine,
                    },
                    target: {
                        from: targetFromLine,
                        to: targetToLine,
                    },
                    lines: [],
                };

                sourceLine = sourceFromLine - 1;
                targetLine = targetFromLine - 1;
                headerType = 5;
            }
        }

        if (headerType === 5) {
            if (line.startsWith(' ')) {
                sourceLine += 1;
                targetLine += 1;

                hunk.lines.push({
                    type: 'normal',
                    line: {
                        source: sourceLine,
                        target: targetLine,
                    },
                });
            } else if (line.startsWith('+')) {
                targetLine += 1;

                hunk.lines.push({
                    type: 'added',
                    line: {
                        source: sourceLine,
                        target: targetLine,
                    },
                });
            } else if (line.startsWith('-')) {
                sourceLine += 1;

                hunk.lines.push({
                    type: 'removed',
                    line: {
                        source: sourceLine,
                        target: targetLine,
                    },
                });
            }
        }
    });

    if (hunk) {
        file.hunks = file.hunks || [];
        file.hunks.push(hunk);
    }

    if (file) {
        files.push(file);
    }

    return {
        files,
    };
}
