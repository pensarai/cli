import React, { useEffect, useState } from "react";
import { render, Box, Text, Static, useStdin, useInput, Spacer } from "ink";
import { ignoreIssue, processFileWithDiffs, type Diff } from "../commands/apply-patch";
import { VerticalDivider } from "./divider";
import Spinner from "ink-spinner";


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

        // TODO: display diffs in a more human-friendly way

        // TODO: make scan message/spinner more fun

        if(input === "a") {
            await applyOrIgnoreDiff(currentDiffIdx, "applied");
        }

        if(input === "i") {
            await applyOrIgnoreDiff(currentDiffIdx, "ignored");
        }
        
    });

    return (
        <Box
         flexDirection="row"
         height={30}
         columnGap={4}
        >
            <Box flexDirection="column"
             gap={1}
            >
                {
                    diffArray.map((diff, i) => (
                        <DiffListItem
                         active={i===currentDiffIdx}
                         diff={diff}
                         key={`diff-list-item-${i}`}
                        />
                    ))
                }
                <Spacer/>
                <Box flexDirection="column">
                    <Text color={"grey"}>
                        u-arrow, d-arrow to nav
                    </Text>
                    <Text color={"grey"}>
                        'a' - accept change
                    </Text>
                    <Text color={"grey"}>
                        'i' - ignore change
                    </Text>
                </Box>
            </Box>
            <VerticalDivider height={20}/>
            <Box>
                <Text>
                    {
                        diffs[currentDiffIdx].diff
                    }
                </Text>
            </Box>
        </Box>
    )
}

const LoadingTextOptions: string[] = [
    "Hunting vulnerabilities 🤠",
    "Hacking the hackers 🦹‍♂️",
    "Sniffing out security flaws 🕵️",
    "Probing defenses 🛡️",
    "Debugging the matrix 🕴️",
    "Poking holes in digital armor 🧀",
    "Herding cyber cats 🐱‍💻"
];

const randomLoadingTextOption = () => {
    let index = Math.floor(Math.random()*(LoadingTextOptions.length-1));
    return LoadingTextOptions[index];

}

const ScanLoaderView = () => {
    const [loadingText, setLoadingText] = useState<string>(randomLoadingTextOption());

    useEffect(() => {
        setInterval(() => {
            setLoadingText(randomLoadingTextOption());
        }, 10000);
    });

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
    const {clear} = render(<ScanLoaderView/>);
    return clear
}

export async function renderMainView(diffs: Diff[]) {
    console.clear();
    await render(<Main
     diffs={diffs}
    />).waitUntilExit();
    console.clear();
}

