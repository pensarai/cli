import React, { useEffect, useState } from "react";
import { render, Box, Text, useStdin, useInput, Spacer } from "ink";
import { ignoreIssue, processFileWithDiffs } from "../commands/apply-patch";
import { VerticalDivider } from "./divider";
import Spinner from "ink-spinner";
import { withFullScreen } from "./fullscreen/withFullScreen";
const DiffListItem = ({
  diff,
  active
}) => {
  return /*#__PURE__*/React.createElement(Box, {
    flexDirection: "row"
  }, /*#__PURE__*/React.createElement(Text, {
    color: active ? "blue" : undefined,
    bold: active
  }, diff.issue.issueId), diff.status === "applied" && /*#__PURE__*/React.createElement(Text, {
    color: "greenBright"
  }, "\u2713"), diff.status === "ignored" && /*#__PURE__*/React.createElement(Text, {
    color: "yellow"
  }, "~"));
};
const DiffDisplay = ({
  diffText
}) => {
  const formatDiff = input => {
    input = input.replace("<diff>", "").replace("</diff>", "");
    const lines = input.split("\n");
  };
  return /*#__PURE__*/React.createElement(Box, null);
};
const Main = ({
  diffs
}) => {
  const {
    setRawMode
  } = useStdin();
  const [currentDiffIdx, setCurrenDiffIdx] = useState(0);
  const [diffArray, setDiffArray] = useState(diffs);
  useEffect(() => {
    setRawMode(true);
    return () => {
      setRawMode(false);
    };
  });
  const applyOrIgnoreDiff = async (index, status) => {
    let diff = diffArray[index];
    // TODO: revert change if status already set
    if (status === "applied") {
      try {
        await processFileWithDiffs(diff.issue.location, diff.diff);
        updateDiffStatus(index, status);
      } catch (error) {
        // TODO: display error to user
      }
    }
    if (status === "ignored") {
      try {
        await ignoreIssue(diff.issue);
        updateDiffStatus(index, status);
      } catch (error) {
        // TODO: display error to user or kill process and log error gracefully
      }
    }
  };
  const updateDiffStatus = async (index, status) => {
    let diff = diffArray[index];
    diff = {
      ...diff,
      status: status
    };
    let newDiffArray = diffArray.map((d, i) => {
      if (i === index) {
        return diff;
      }
      return d;
    });
    setDiffArray(newDiffArray);
  };
  useInput(async (input, key) => {
    if (key.upArrow) {
      if (currentDiffIdx !== 0) {
        setCurrenDiffIdx(prev => prev - 1);
      }
    }
    if (key.downArrow) {
      if (currentDiffIdx < diffs.length - 1) {
        setCurrenDiffIdx(prev => prev + 1);
      }
    }

    // TODO: display diffs in a more human-friendly way

    // TODO: make scan message/spinner more fun

    if (input === "a") {
      await applyOrIgnoreDiff(currentDiffIdx, "applied");
    }
    if (input === "i") {
      await applyOrIgnoreDiff(currentDiffIdx, "ignored");
    }
  });
  return /*#__PURE__*/React.createElement(Box, {
    flexDirection: "row",
    height: 30,
    columnGap: 4
  }, /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column",
    gap: 1
  }, diffArray.map((diff, i) => /*#__PURE__*/React.createElement(DiffListItem, {
    active: i === currentDiffIdx,
    diff: diff,
    key: `diff-list-item-${i}`
  })), /*#__PURE__*/React.createElement(Spacer, null), /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column"
  }, /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, "u-arrow, d-arrow to nav"), /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, "'a' - accept change"), /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, "'i' - ignore change"))), /*#__PURE__*/React.createElement(VerticalDivider, {
    height: 20
  }), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, null, diffs[currentDiffIdx].diff)));
};
const LoadingTextOptions = ["\tHunting vulnerabilities 🤠", "\tHacking the hackers 🦹‍♂️", "\tSniffing out security flaws 🕵️", "\tProbing defenses 🛡️", "\tDebugging the matrix 🕴️", "\tPoking holes in digital armor 🧀", "\tHerding cyber cats 🐱‍💻"];
const randomLoadingTextOption = () => {
  let index = Math.floor(Math.random() * (LoadingTextOptions.length - 1));
  return LoadingTextOptions[index];
};
const ScanLoaderView = () => {
  const [loadingText, setLoadingText] = useState(randomLoadingTextOption());
  useEffect(() => {
    let interval = setInterval(() => {
      setLoadingText(randomLoadingTextOption());
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);
  return /*#__PURE__*/React.createElement(Text, null, /*#__PURE__*/React.createElement(Text, null, /*#__PURE__*/React.createElement(Spinner, {
    type: "dots"
  })), loadingText);
};
export function renderScanLoader() {
  const {
    unmount
  } = render(/*#__PURE__*/React.createElement(ScanLoaderView, null), {
    exitOnCtrlC: true
  });
  return {
    unmount
  };
}
export async function renderMainView(diffs) {
  withFullScreen(/*#__PURE__*/React.createElement(Main, {
    diffs: diffs
  })).start();
}
