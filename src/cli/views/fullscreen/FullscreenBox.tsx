import { Box, type DOMElement, useInput } from "ink";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { useScreenSize } from "./useScreenSize";
import React from "react";

export type BoxProps = ComponentPropsWithoutRef<typeof Box>;

export const FullscreenBox = forwardRef<DOMElement, BoxProps>(
    function FullscreenBox(props, ref) {
        useInput(() => {});
        const { height, width } = useScreenSize();
             // @pensar-ok
        return <Box ref={ref} height={height} width={width} {...props}/>
    }
);