import React, { useEffect, useRef, useState } from "react";
import { render, Box, Text, useStdin, useInput, Spacer, measureElement } from "ink";
import { ignoreIssue, processFileWithDiffs } from "../commands/scan/apply-patch";
import Spinner from "ink-spinner";
import { withFullScreen } from "./fullscreen/withFullScreen";
import { parseUnixDiff } from "./parseDiff";
import { updateIssueCloseStatus } from "../remote-logging";
const DiffListItem = ({
  diff,
  active,
  loading
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
  }, "~"), loading && /*#__PURE__*/React.createElement(Text, {
    color: "blue"
  }, /*#__PURE__*/React.createElement(Spinner, {
    type: "dots"
  })));
};
const DiffDisplay = ({
  diff
}) => {
  const ref = useRef(null);
  const formatDiff = input => {
    input = input.replace("<diff>", "").replace("</diff>", "");
    let formattedDiff = parseUnixDiff(input);
    return formattedDiff;
  };
  return /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column",
    gap: 2,
    ref: ref
  }, /*#__PURE__*/React.createElement(Text, {
    color: "gray"
  }, diff.issue.location), /*#__PURE__*/React.createElement(Box, {
    flexDirection: "column"
  }, !diff.diff && /*#__PURE__*/React.createElement(Text, {
    color: "red"
  }, "There was an error generating this auto-fix."), diff.diff && formatDiff(diff.diff).split("\n").map((s, i) => /*#__PURE__*/React.createElement(Text, {
    key: `${diff.issue.uid}-diff-line-${i}`,
    color: s[0] === "-" ? "red" : "green"
  }, s))), /*#__PURE__*/React.createElement(Box, {
    flexShrink: 1
  }, /*#__PURE__*/React.createElement(Text, null, diff.issue.message)));
};
const Header = ({
  title
}) => {
  const ref = useRef(null);
  const [dims, setDims] = useState();
  useEffect(() => {
    if (ref.current) {
      const _dims = measureElement(ref.current);
      setDims(_dims);
    }
  }, [ref.current]);
  return /*#__PURE__*/React.createElement(Box, {
    width: "100%",
    borderStyle: "round",
    ref: ref
  }, ref.current && dims && /*#__PURE__*/React.createElement(Text, {
    color: "white",
    bold: true
  }, title));
};
const Main = ({
  diffs,
  scanId,
  noLogging,
  apiKey
}) => {
  if (!noLogging && !apiKey) {
    throw new Error("Pensar API key required if metrics logging is not disabled");
  }
  const {
    setRawMode
  } = useStdin();
  const [currentDiffIdx, setCurrenDiffIdx] = useState(0);
  const [diffArray, setDiffArray] = useState(diffs);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setRawMode(true);
    return () => {
      setRawMode(false);
    };
  }, []);
  const showError = e => {
    setError(e);
    setTimeout(() => {
      setError(null);
    }, 1000);
  };
  const applyOrIgnoreDiff = async diffAction => {
    let {
      diff,
      action
    } = diffAction;
    if (!diff.diff) {
      return;
    }
    if (action === "apply") {
      try {
        await processFileWithDiffs(diff.issue.location, diff.diff);
      } catch (error) {
        // TODO: display error to user & log 
        // setError(String(error));
        showError(String(error));
      }
    }
    if (action === "ignore") {
      try {
        await ignoreIssue(diff.issue);
      } catch (error) {
        // TODO: display error to user or and log error gracefully
        showError(String(error));
      }
    }
  };
  const updateDiffStatus = async (index, status) => {
    setLoading(index);
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
    await applyOrIgnoreDiff({
      diff,
      action: status === "applied" ? "apply" : "ignore"
    });
    if (!noLogging) {
      try {
        await updateIssueCloseStatus(scanId, diff.issue.uid, {
          closeMethod: status === "applied" ? "manual" : "ignore",
          apiKey: apiKey
        });
      } catch (error) {
        // TODO: log error
        showError(String(error));
      }
    }
    setLoading(null);
  };
  useInput(async (input, key) => {
    if (key.upArrow) {
      if (currentDiffIdx > 0) {
        setCurrenDiffIdx(prev => prev - 1);
      }
    }
    if (key.downArrow) {
      if (currentDiffIdx < diffArray.length - 1) {
        setCurrenDiffIdx(prev => prev + 1);
      }
    }
    if (input === "a") {
      updateDiffStatus(currentDiffIdx, "applied");
    }
    if (input === "i") {
      updateDiffStatus(currentDiffIdx, "ignored");
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
    loading: loading === i,
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
  }))), /*#__PURE__*/React.createElement(Spacer, null), error && /*#__PURE__*/React.createElement(Box, {
    flexDirection: "row"
  }, /*#__PURE__*/React.createElement(Text, {
    backgroundColor: "red",
    color: "white"
  }, error)), !error && /*#__PURE__*/React.createElement(Box, {
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
const LoadingTextOptions = ["  Hunting vulnerabilities 🤠", "  Sniffing out security flaws 🕵️", "  Probing defenses 🛡️", "  Debugging the matrix 🕴️", "  Poking holes in digital armor 🧀", "  Herding cyber cats 🐱‍💻"];
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
export async function renderMainView(props) {
  withFullScreen(/*#__PURE__*/React.createElement(Main, {
    diffs: props.diffs,
    scanId: props.scanId,
    noLogging: props.noLogging,
    apiKey: props.apiKey
  })).start();
}
