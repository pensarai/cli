import React from 'react';
import {Box, Text} from 'ink';

const dividerString = "|";

export const VerticalDivider = ({
    height
}: { height: number }) => {
    return (
        <Box
         borderStyle={"single"}
         borderLeftColor={"black"}
         borderBottomColor={"black"}
         borderTopColor={"black"}
         height={"100%"}
        />
    )
}