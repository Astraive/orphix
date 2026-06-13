// Utilities
export { cn } from "./cn";

// Hooks
export { useIsMobile } from "./hooks/use-mobile";

// Custom layout components (desktop)
export { ResizeHandle } from "./components/ResizeHandle";
export type { ResizeDirection } from "./components/ResizeHandle";
export { ResizablePanel as SideResizablePanel } from "./components/ResizablePanel";

// File tree
export { WorkspaceFileTree } from "./components/file-tree/WorkspaceFileTree";
export { buildPreparedTreeData, isAncestorPath, joinAbsolutePath, mapGitStatusEntries, renameAbsolutePath, toRelativeTreePath } from "./components/file-tree/utils";
export type { FileTreeEntry, FileTreeGitEntry, PreparedTreeData } from "./components/file-tree/utils";

// shadcn/ui components
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/ui/accordion";
export { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./components/ui/alert-dialog";
export { AspectRatio } from "./components/ui/aspect-ratio";
export { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
export { Badge, badgeVariants } from "./components/ui/badge";
export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./components/ui/breadcrumb";
export { Button, buttonVariants } from "./components/ui/button";
export { ButtonGroup } from "./components/ui/button-group";
export { Calendar } from "./components/ui/calendar";
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./components/ui/carousel";
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "./components/ui/chart";
export { Checkbox } from "./components/ui/checkbox";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible";
export { Combobox, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "./components/ui/combobox";
export { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "./components/ui/command";
export { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuPortal, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "./components/ui/context-menu";
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerPortal, DrawerTitle, DrawerTrigger } from "./components/ui/drawer";
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./components/ui/empty";
export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "./components/ui/field";
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./components/ui/form";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./components/ui/hover-card";
export { Input } from "./components/ui/input";
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText } from "./components/ui/input-group";
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./components/ui/input-otp";
export { Kbd } from "./components/ui/kbd";
export { Label } from "./components/ui/label";
export { Menubar, MenubarCheckboxItem, MenubarContent, MenubarGroup, MenubarItem, MenubarLabel, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "./components/ui/menubar";
export { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "./components/ui/navigation-menu";
export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./components/ui/pagination";
export { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
export { Progress } from "./components/ui/progress";
export { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
export { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./components/ui/select";
export { Separator } from "./components/ui/separator";
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarSeparator, SidebarTrigger, useSidebar } from "./components/ui/sidebar";
export { Skeleton } from "./components/ui/skeleton";
export { Slider } from "./components/ui/slider";
export { Toaster } from "./components/ui/sonner";
export { Spinner } from "./components/ui/spinner";
export { Switch } from "./components/ui/switch";
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./components/ui/table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
export { Textarea } from "./components/ui/textarea";
export { Toggle, toggleVariants } from "./components/ui/toggle";
export { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

// Animate UI components (animated versions of shadcn)
export { Accordion as AnimatedAccordion, AccordionContent as AnimatedAccordionContent, AccordionItem as AnimatedAccordionItem, AccordionTrigger as AnimatedAccordionTrigger } from "./components/animate-ui/components/radix/accordion";
export { AlertDialog as AnimatedAlertDialog, AlertDialogAction as AnimatedAlertDialogAction, AlertDialogCancel as AnimatedAlertDialogCancel, AlertDialogContent as AnimatedAlertDialogContent, AlertDialogDescription as AnimatedAlertDialogDescription, AlertDialogFooter as AnimatedAlertDialogFooter, AlertDialogHeader as AnimatedAlertDialogHeader, AlertDialogTitle as AnimatedAlertDialogTitle, AlertDialogTrigger as AnimatedAlertDialogTrigger } from "./components/animate-ui/components/radix/alert-dialog";
export { Checkbox as AnimatedCheckbox } from "./components/animate-ui/components/radix/checkbox";
export { Dialog as AnimatedDialog, DialogClose as AnimatedDialogClose, DialogContent as AnimatedDialogContent, DialogDescription as AnimatedDialogDescription, DialogFooter as AnimatedDialogFooter, DialogHeader as AnimatedDialogHeader, DialogTitle as AnimatedDialogTitle, DialogTrigger as AnimatedDialogTrigger } from "./components/animate-ui/components/radix/dialog";
export { DropdownMenu as AnimatedDropdownMenu, DropdownMenuCheckboxItem as AnimatedDropdownMenuCheckboxItem, DropdownMenuContent as AnimatedDropdownMenuContent, DropdownMenuGroup as AnimatedDropdownMenuGroup, DropdownMenuItem as AnimatedDropdownMenuItem, DropdownMenuLabel as AnimatedDropdownMenuLabel, DropdownMenuRadioGroup as AnimatedDropdownMenuRadioGroup, DropdownMenuRadioItem as AnimatedDropdownMenuRadioItem, DropdownMenuSeparator as AnimatedDropdownMenuSeparator, DropdownMenuShortcut as AnimatedDropdownMenuShortcut, DropdownMenuSub as AnimatedDropdownMenuSub, DropdownMenuSubContent as AnimatedDropdownMenuSubContent, DropdownMenuSubTrigger as AnimatedDropdownMenuSubTrigger, DropdownMenuTrigger as AnimatedDropdownMenuTrigger } from "./components/animate-ui/components/radix/dropdown-menu";
export { HoverCard as AnimatedHoverCard, HoverCardContent as AnimatedHoverCardContent, HoverCardTrigger as AnimatedHoverCardTrigger } from "./components/animate-ui/components/radix/hover-card";
export { Popover as AnimatedPopover, PopoverContent as AnimatedPopoverContent, PopoverTrigger as AnimatedPopoverTrigger } from "./components/animate-ui/components/radix/popover";
export { Progress as AnimatedProgress } from "./components/animate-ui/components/radix/progress";
export { RadioGroup as AnimatedRadioGroup, RadioGroupItem as AnimatedRadioGroupItem } from "./components/animate-ui/components/radix/radio-group";
export { Sheet as AnimatedSheet, SheetClose as AnimatedSheetClose, SheetContent as AnimatedSheetContent, SheetDescription as AnimatedSheetDescription, SheetFooter as AnimatedSheetFooter, SheetHeader as AnimatedSheetHeader, SheetTitle as AnimatedSheetTitle, SheetTrigger as AnimatedSheetTrigger } from "./components/animate-ui/components/radix/sheet";
export { Switch as AnimatedSwitch } from "./components/animate-ui/components/radix/switch";
export { Tabs as AnimatedTabs, TabsContent as AnimatedTabsContent, TabsList as AnimatedTabsList, TabsTrigger as AnimatedTabsTrigger } from "./components/animate-ui/components/radix/tabs";
export { Toggle as AnimatedToggle, toggleVariants as animatedToggleVariants } from "./components/animate-ui/components/radix/toggle";
export { ToggleGroup as AnimatedToggleGroup, ToggleGroupItem as AnimatedToggleGroupItem } from "./components/animate-ui/components/radix/toggle-group";
export { Tooltip as AnimatedTooltip, TooltipContent as AnimatedTooltipContent, TooltipTrigger as AnimatedTooltipTrigger } from "./components/animate-ui/components/radix/tooltip";
export { Button as AnimatedButton, buttonVariants as animatedButtonVariants } from "./components/animate-ui/components/buttons/button";
export { RippleButton } from "./components/animate-ui/components/buttons/ripple";
export { CopyButton } from "./components/animate-ui/components/buttons/copy";
export { IconButton } from "./components/animate-ui/components/buttons/icon";
export { SlidingNumber } from "./components/animate-ui/primitives/texts/sliding-number";
export { Highlight } from "./components/animate-ui/primitives/effects/highlight";
export { Particles } from "./components/animate-ui/primitives/effects/particles";
export { AutoHeight } from "./components/animate-ui/primitives/effects/auto-height";
