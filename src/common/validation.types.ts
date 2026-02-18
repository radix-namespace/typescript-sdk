import NamespaceSDK from "..";
import { ErrorI } from "./response.types";
import { UtilValidationT } from "./util.types";

export type ParamProcessConfigT = {
    normalize?: (value: any, instance: NamespaceSDK) => any | Promise<any>;
    validate?: (value: any, instance: NamespaceSDK) => UtilValidationT | Promise<UtilValidationT>;
    missingError?: (value: any, instance: NamespaceSDK) => ErrorI;
};

export type ParamProcessMapT = {
    _default?: { [key: string]: ParamProcessConfigT };
    [methodName: string]: { [key: string]: ParamProcessConfigT } | undefined;
};