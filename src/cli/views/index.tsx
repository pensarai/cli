import React, { useEffect, useRef, useState } from "react";
import { render, Box, Text, Static, useStdin, useInput, Spacer, type DOMElement, measureElement } from "ink";
import { ignoreIssue, processFileWithDiffs, type Diff } from "../commands/scan/apply-patch";
import Spinner from "ink-spinner";
import { withFullScreen } from "./fullscreen/withFullScreen";
import { parseUnixDiff } from "./parseDiff";
import { updateIssueCloseStatus } from "../logging";
import type { MainViewProps } from "@/lib/types";


const DiffListItem = ({ diff, active, loading }: { diff: Diff, active: boolean, loading: boolean }) => {
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
            {
                loading &&
                <Text color={"blue"}>
                    <Spinner type="dots"/>
                </Text>
            }
        </Box>
    )
}

const DiffDisplay = ({ diff }: { diff: Diff }) => {

    const ref = useRef<DOMElement>(null);

    const formatDiff = (input: string) => {
        input = input.replace("<diff>", "").replace("</diff>", "");
        let formattedDiff = parseUnixDiff(input);
        return formattedDiff
    }
    
    return (
        <Box flexDirection="column"
         gap={2}
         ref={ref}
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
            <Box flexShrink={1}>
                <Text>
                    { diff.issue.message }
                </Text>
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
            setDims(_dims);
        }
    }, [ref.current]);

    return (
        <Box width={"100%"} borderStyle={"round"} ref={ref}>
            {
                (ref.current && dims) &&
                <Text color={"white"} bold>
                    {/* { `${title}${" ".repeat(dims.width-title.length)}` } */}
                    { title }
                </Text>
            }
        </Box>
    )
}

type DiffActionToApply = {
    diff: Diff;
    action: "apply" | "ignore";
};

const Main = ({ diffs, scanId, noLogging, apiKey }: MainViewProps) => {
    
    if(!noLogging && !apiKey) {
        throw new Error("Pensar API key required if metrics logging is not disabled");
    }
    
    const {setRawMode} = useStdin();

    const [currentDiffIdx, setCurrenDiffIdx] = useState(0);
    const [diffArray, setDiffArray] = useState<Diff[]>(diffs);
    const [loading, setLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setRawMode(true);

        return () => {
            setRawMode(false);
        }
    }, []);

    const showError = (e: string) => {
        setError(e);
        setTimeout(() => {
            setError(null);
        }, 1000);
    }

    const applyOrIgnoreDiff = async (diffAction: DiffActionToApply) => {
        let { diff, action } = diffAction;
        if(action === "apply") {
            try {
                await processFileWithDiffs(diff.issue.location, diff.diff);
            } catch(error) {
                // TODO: display error to user & log 
                // setError(String(error));
                showError(String(error));
                
            }
        }
        if(action === "ignore") {
            try {
                await ignoreIssue(diff.issue);
            } catch(error) {
                // TODO: display error to user or and log error gracefully
                showError(String(error));
            }
        }
    }

    const updateDiffStatus = async (index: number, status: Diff['status']) => {
        setLoading(index);
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

        await applyOrIgnoreDiff({diff, action: status==="applied" ? "apply": "ignore"});
        if(!noLogging) {
            try {
                await updateIssueCloseStatus(
                    scanId, diff.issue.uid, {
                        closeMethod: status === "applied" ? "manual" : "ignore",
                        apiKey: apiKey as string
                    }
                );
            } catch(error) {
                // TODO: log error
                showError(String(error));
            }
        }
        setLoading(null);
    }

    useInput( async (input, key) => {
        if(key.upArrow) {
            if(currentDiffIdx > 0) {
                setCurrenDiffIdx((prev) => prev-1);
            }
        }
        
        if(key.downArrow) {
            if(currentDiffIdx < diffArray.length-1) {
                setCurrenDiffIdx((prev) => prev+1);
            }

        }

        if(input === "a") {
            updateDiffStatus(currentDiffIdx, "applied");

        }

        if(input === "i") {
            updateDiffStatus(currentDiffIdx, "ignored");
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
                                 loading={loading===i}
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
            {
                error &&
                <Box flexDirection="row">
                    <Text backgroundColor={"red"} color={"white"}>
                        { error }
                    </Text>
                </Box>
            }
            {
                !error &&
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
            }
        </Box>
    )
}

const LoadingTextOptions: string[] = [
    "  Hunting vulnerabilities 🤠",
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

export async function renderMainView(props: MainViewProps) {
    withFullScreen(<Main 
        diffs={props.diffs} 
        scanId={props.scanId} 
        noLogging={props.noLogging} 
        apiKey={props.apiKey} 
    />).start();
}

