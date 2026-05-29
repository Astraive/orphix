export interface FileIconProps {
  className?: string;
  size?: number;
}

export type IconComponent = React.FC<FileIconProps>;

export interface IconPack {
  name: string;
  getFileIcon: (fileName: string, isDir: boolean, isOpen?: boolean) => IconComponent;
}
