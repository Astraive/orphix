import type { SvgProps } from "react-native-svg";
import type React from "react";

export interface LucideProps extends SvgProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

type Icon = React.FC<any>;

export declare const AlertCircle: Icon;
export declare const ArrowLeft: Icon;
export declare const Check: Icon;
export declare const ChevronDown: Icon;
export declare const ChevronRight: Icon;
export declare const Code: Icon;
export declare const Container: Icon;
export declare const Eye: Icon;
export declare const FileText: Icon;
export declare const Folder: Icon;
export declare const GitBranch: Icon;
export declare const GitCommit: Icon;
export declare const GitPullRequest: Icon;
export declare const Globe: Icon;
export declare const Layout: Icon;
export declare const Loader2: Icon;
export declare const LogOut: Icon;
export declare const Maximize2: Icon;
export declare const Menu: Icon;
export declare const Minimize2: Icon;
export declare const Monitor: Icon;
export declare const Play: Icon;
export declare const Plus: Icon;
export declare const RefreshCw: Icon;
export declare const RotateCw: Icon;
export declare const Settings: Icon;
export declare const Smartphone: Icon;
export declare const Square: Icon;
export declare const Terminal: Icon;
export declare const Trash2: Icon;
export declare const Unplug: Icon;
export declare const User: Icon;
export declare const Wifi: Icon;
export declare const WifiOff: Icon;
export declare const X: Icon;
