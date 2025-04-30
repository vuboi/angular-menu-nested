import { LucideIconData } from "lucide-angular";

export interface IMenuItem {
  id: string;
  name: string;
  icon: LucideIconData;
  path?: string;
  subPaths?: string[];
  active?: boolean;
  hidden?: boolean;
  expanded?: boolean;
  children?: IMenuItem[];
  level?: number;
  parents?: Record<string, IMenuItem>;
}
