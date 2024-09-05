import React, { useEffect, useRef, useState } from "react";
import { render, Box, Text, useStdin, useInput, Spacer, measureElement } from "ink";
import { ignoreIssue, processFileWithDiffs } from "../commands/apply-patch";
import Spinner from "ink-spinner";
import { withFullScreen } from "./fullscreen/withFullScreen";
import { parseUnixDiff } from "./parseDiff";
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
  diff
}) => {
  const formatDiff = input => {
    input = input.replace("<diff>", "").replace("</diff>", "");
    let formattedDiff = parseUnixDiff(input);
    return formattedDiff;
  };
  return /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column",
    gap: 2
  }, /*#__PURE__*/React.createElement(Text, {
    color: "gray"
  }, diff.issue.location), /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column"
  }, formatDiff(diff.diff).split("\n").map((s, i) => /*#__PURE__*/React.createElement(Text, {
    key: `${diff.issue.uid}-diff-line-${i}`,
    color: s[0] === "-" ? "red" : "green"
  }, s))));
};
const Header = ({
  title
}) => {
  const ref = useRef(null);
  const [dims, setDims] = useState();
  useEffect(() => {
    if (ref.current) {
      const _dims = measureElement(ref.current);
      console.log(_dims);
      setDims(_dims);
    }
  }, [ref.current]);
  return /*#__PURE__*/React.createElement(Box, {
    width: "100%",
    ref: ref
  }, ref.current && dims && /*#__PURE__*/React.createElement(Text, {
    backgroundColor: "#626e8c",
    color: "white",
    bold: true
  }, `${title}${" ".repeat(dims.width - title.length)}`));
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
    if (diff.status) {
      return;
    }
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
    if (input === "a") {
      await applyOrIgnoreDiff(currentDiffIdx, "applied");
    }
    if (input === "i") {
      await applyOrIgnoreDiff(currentDiffIdx, "ignored");
    }
  });
  return /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column",
    height: "100%"
  }, /*#__PURE__*/React.createElement(Box, {
    flexDirection: "row",
    height: "100%",
    columnGap: 4
  }, /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column",
    rowGap: 1
  }, /*#__PURE__*/React.createElement(Header, {
    title: "Issues"
  }), diffArray.map((diff, i) => /*#__PURE__*/React.createElement(DiffListItem, {
    active: i === currentDiffIdx,
    diff: diff,
    key: `diff-list-item-${i}`
  }))), /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column",
    rowGap: 1
  }, /*#__PURE__*/React.createElement(Header, {
    title: "Apply change to fix"
  }), /*#__PURE__*/React.createElement(DiffDisplay, {
    diff: diffArray[currentDiffIdx]
  }))), /*#__PURE__*/React.createElement(Spacer, null), /*#__PURE__*/React.createElement(Box, {
    flexDirection: "row",
    columnGap: 1
  }, /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, /*#__PURE__*/React.createElement(Text, {
    bold: true,
    color: "white"
  }, "\u2191"), ", ", /*#__PURE__*/React.createElement(Text, {
    bold: true,
    color: "white"
  }, "\u2193"), " to nav"), /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, "-"), /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, /*#__PURE__*/React.createElement(Text, {
    bold: true,
    color: "white"
  }, "a"), " accept change"), /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, "-"), /*#__PURE__*/React.createElement(Text, {
    color: "grey"
  }, /*#__PURE__*/React.createElement(Text, {
    bold: true,
    color: "white"
  }, "i"), " ignore change")));
};
const LoadingTextOptions = ["  Hunting vulnerabilities 🤠", "  Hacking the hackers 🦹‍♂️", "  Sniffing out security flaws 🕵️", "  Probing defenses 🛡️", "  Debugging the matrix 🕴️", "  Poking holes in digital armor 🧀", "  Herding cyber cats 🐱‍💻"];
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
