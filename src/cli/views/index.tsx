import React, { useEffect, useRef, useState } from "react";
import { render, Box, Text, Static, useStdin, useInput, Spacer, type DOMElement, measureElement } from "ink";
import { ignoreIssue, processFileWithDiffs, type Diff } from "../commands/apply-patch";
import { VerticalDivider } from "./divider";
import Spinner from "ink-spinner";
import { withFullScreen } from "./fullscreen/withFullScreen";
import { parseUnixDiff } from "./parseDiff";


const DiffListItem = ({ diff, active }: { diff: Diff, active: boolean }) => {
    return (
        <Box flexDirection="row">
            <Text
            color={active ? "blue": undefined}
            bold={active}
            >
                {
                    diff.issue.issueId
                }
            </Text>
            {
                diff.status === "applied" &&
                <Text color={"greenBright"}>✓</Text>
            }
            {
                diff.status === "ignored" &&
                <Text color={"yellow"}>~</Text>
            }
        </Box>
    )
}

const DiffDisplay = ({ diff }: { diff: Diff }) => {
    const formatDiff = (input: string) => {
        input = input.replace("<diff>", "").replace("</diff>", "");
        let formattedDiff = parseUnixDiff(input);
        return formattedDiff
    }
    
    return (
        <Box flexDirection="column"
         gap={2}
        >
            <Text color={"gray"}>
                { diff.issue.location }
            </Text>
            <Box flexDirection="column">
                {
                    formatDiff(diff.diff).split("\n").map((s, i) => (
                        <Text key={`${diff.issue.uid}-diff-line-${i}`} color={s[0] === "-" ? "red" : "green"}>{ s }</Text>
                    ))
                }
            </Box>
        </Box>
    )
}

const Header = ({ title }: { title: string }) => {
    const ref = useRef<DOMElement>(null);
    const [dims, setDims] = useState<{width: number, height: number}>();
    
    useEffect(() => {
        if(ref.current) {
            const _dims = measureElement(ref.current);
            console.log(_dims)
            setDims(_dims);
        }
    }, [ref.current]);

    return (
        <Box width={"100%"} ref={ref}>
            {
                (ref.current && dims) &&
                <Text backgroundColor={"#626e8c"} color={"white"} bold>
                    { `${title}${" ".repeat(dims.width-title.length)}` }
                </Text>
            }
        </Box>
    )
}

const Main = ({ diffs }: { diffs: Diff[] }) => {
    const {setRawMode} = useStdin();

    const [currentDiffIdx, setCurrenDiffIdx] = useState(0);
    const [diffArray, setDiffArray] = useState<Diff[]>(diffs);

    useEffect(() => {
        setRawMode(true);

        return () => {
            setRawMode(false);
        }
    });

    const applyOrIgnoreDiff = async (index: number, status: Diff['status']) => {
        let diff = diffArray[index];
        // TODO: revert change if status already set
        if(diff.status) {
            return
        }
        if(status === "applied") {
            try {
                await processFileWithDiffs(diff.issue.location, diff.diff);
                updateDiffStatus(index, status);
            } catch(error) {
                // TODO: display error to user
            }
        }
        if(status === "ignored") {
            try {
                await ignoreIssue(diff.issue);
                updateDiffStatus(index, status);
            } catch(error) {
                // TODO: display error to user or kill process and log error gracefully
            }
        }
    }

    const updateDiffStatus = async (index: number, status: Diff['status']) => {
        let diff = diffArray[index];
        diff = {
            ...diff,
            status: status
        }
        let newDiffArray = diffArray.map((d, i) => {
            if(i === index) {
                return diff
            }
            return d
        });

        setDiffArray(newDiffArray);
    }

    useInput( async (input, key) => {
        if(key.upArrow) {
            if(currentDiffIdx !== 0) {
                setCurrenDiffIdx((prev) => prev-1);
            }
        }
        
        if(key.downArrow) {
            if(currentDiffIdx < diffs.length-1) {
                setCurrenDiffIdx((prev) => prev+1);
            }
        }

        if(input === "a") {
            await applyOrIgnoreDiff(currentDiffIdx, "applied");
        }

        if(input === "i") {
            await applyOrIgnoreDiff(currentDiffIdx, "ignored");
        }
        
    });

    return (
        <Box flexDirection="column"
         height={"100%"}
        >
            <Box
            flexDirection="row"
            height={"100%"}
            columnGap={4}
            >
                    <Box flexDirection="column"
                    rowGap={1}
                    >
                        <Header title="Issues"/>
                        {
                            diffArray.map((diff, i) => (
                                <DiffListItem
                                active={i===currentDiffIdx}
                                diff={diff}
                                key={`diff-list-item-${i}`}
                                />
                            ))
                        }
                    </Box>

                    <Box flexDirection="column"
                     rowGap={1}
                    >
                        <Header title="Apply change to fix"/>
                        <DiffDisplay
                         diff={diffArray[currentDiffIdx]}
                        />
                    </Box>
            </Box>
            <Spacer/>
            <Box flexDirection="row" columnGap={1}>
                <Text color={"grey"}>
                <Text bold color={"white"}>↑</Text>, <Text bold color={"white"}>↓</Text> to nav
                </Text>
                <Text color={"grey"}>
                    -
                </Text>
                <Text color={"grey"}>
                    <Text bold color={"white"}>a</Text> accept change
                </Text>
                <Text color={"grey"}>
                    -
                </Text>
                <Text color={"grey"}>
                    <Text bold color={"white"}>i</Text> ignore change
                </Text>
            </Box>
        </Box>
    )
}

const LoadingTextOptions: string[] = [
    "  Hunting vulnerabilities 🤠",
    "  Hacking the hackers 🦹‍♂️",
    "  Sniffing out security flaws 🕵️",
    "  Probing defenses 🛡️",
    "  Debugging the matrix 🕴️",
    "  Poking holes in digital armor 🧀",
    "  Herding cyber cats 🐱‍💻"
];

const randomLoadingTextOption = () => {
    let index = Math.floor(Math.random()*(LoadingTextOptions.length-1));
    return LoadingTextOptions[index];

}

const ScanLoaderView = () => {
    const [loadingText, setLoadingText] = useState<string>(randomLoadingTextOption());

    useEffect(() => {
        let interval = setInterval(() => {
            setLoadingText(randomLoadingTextOption());
        }, 10000);

        return () => {
            clearInterval(interval);
        }
    }, []);

    return (
        <Text>
            <Text>
                <Spinner type="dots"/>
            </Text>
            { loadingText }
        </Text>
    )
}

export function renderScanLoader() {
    const {unmount} = render(<ScanLoaderView/>, {
        exitOnCtrlC: true
    });

    return { unmount }
}

export async function renderMainView(diffs: Diff[]) {
    withFullScreen(<Main diffs={diffs}/>).start();
}

