import * as React from 'react'
import {
  ArchiveBoxIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowUpTrayIcon,
  ArrowsPointingInIcon,
  AtSymbolIcon,
  Bars3BottomLeftIcon,
  BellAlertIcon,
  BoltIcon,
  BriefcaseIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDoubleLeftIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  CircleStackIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  FingerPrintIcon,
  FlagIcon,
  FolderIcon,
  FolderPlusIcon,
  GlobeAltIcon,
  HashtagIcon,
  HomeIcon,
  IdentificationIcon,
  InformationCircleIcon,
  KeyIcon,
  LifebuoyIcon,
  LinkIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MinusIcon,
  MoonIcon,
  PencilSquareIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  QueueListIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  ReceiptPercentIcon,
  ClockIcon,
  ShieldCheckIcon,
  ShareIcon,
  SignalIcon,
  SparklesIcon,
  Squares2X2Icon,
  SquaresPlusIcon,
  SunIcon,
  TagIcon,
  TableCellsIcon,
  TrashIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  ViewColumnsIcon,
  AdjustmentsHorizontalIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon,
  WindowIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

export type IconComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> & {
    title?: string
    titleId?: string
  } & React.RefAttributes<SVGSVGElement>
>

export {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ArrowsPointingInIcon,
  AtSymbolIcon,
  BellAlertIcon,
  BriefcaseIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  CreditCardIcon,
  CircleStackIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  FingerPrintIcon,
  FlagIcon,
  FolderIcon,
  FolderPlusIcon,
  GlobeAltIcon,
  HashtagIcon,
  HomeIcon,
  IdentificationIcon,
  InformationCircleIcon,
  KeyIcon,
  LifebuoyIcon,
  LinkIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapIcon,
  MinusIcon,
  MoonIcon,
  PlusIcon,
  PrinterIcon,
  QueueListIcon,
  RectangleStackIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  ShareIcon,
  SparklesIcon,
  Squares2X2Icon,
  SquaresPlusIcon,
  SunIcon,
  TagIcon,
  TableCellsIcon,
  TrashIcon,
  TruckIcon,
  AdjustmentsHorizontalIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  ViewColumnsIcon,
  ChevronDoubleLeftIcon,
  WindowIcon,
  XCircleIcon,
  XMarkIcon,
}

export const PaintBrush = PaintBrushIcon

export const Activity = BoltIcon
export const AppWindow = WindowIcon
export const ArrowDownFromLine = ArrowDownTrayIcon
export const ArrowLeft = ArrowLeftIcon
export const ArrowRight = ArrowRightIcon
export const ArrowUpFromLine = ArrowUpTrayIcon
export const AtSign = AtSymbolIcon
export const BarChart3 = ChartBarIcon
export const Building2 = BuildingOffice2Icon
export const Bell = BellAlertIcon
export const Calendar = CalendarDaysIcon
export const CheckCircle = CheckCircleIcon
export const CheckCircle2 = CheckCircleIcon
export const ChevronDown = ChevronDownIcon
export const ChevronLeft = ChevronLeftIcon
export const ChevronRight = ChevronRightIcon
export const ChevronUp = ChevronUpIcon
export const ChevronsUpDown = ChevronUpDownIcon
export const CircleCheckIcon = CheckCircleIcon
export const ClipboardList = ClipboardDocumentListIcon
export const Copy = ClipboardDocumentIcon
export const Duplicate = DocumentDuplicateIcon
export const Merge = ArrowsPointingInIcon
export const Printer = PrinterIcon
export const CreditCard = CreditCardIcon
export const Database = CircleStackIcon
export const ExternalLink = ArrowTopRightOnSquareIcon
export const Eye = EyeIcon
export const EyeOff = EyeSlashIcon
export const Fingerprint = FingerPrintIcon
export const Flag = FlagIcon
export const Folder = FolderIcon
export const FolderPlus = FolderPlusIcon
export const Footprints = MapIcon
export const GitCommitVertical = CodeBracketIcon
export const Globe = GlobeAltIcon
export const Globe2 = GlobeAltIcon
export const Hash = HashtagIcon
export const Home = HomeIcon
export const Info = InformationCircleIcon
export const InfoIcon = InformationCircleIcon
export const KeyRound = KeyIcon
export const LayoutDashboard = Squares2X2Icon
export const LayoutGrid = Squares2X2Icon
export const LayoutList = QueueListIcon
export const TableIcon = TableCellsIcon
export const Phone = PhoneIcon
export const Link2 = LinkIcon
export const Loader2Icon = ArrowPathIcon
export const Lock = LockClosedIcon
export const LogOut = ArrowRightOnRectangleIcon
export const Mail = EnvelopeIcon
export const MailCheck = EnvelopeOpenIcon
export const MapPin = MapIcon
export const Minus = MinusIcon
export const Monitor = ComputerDesktopIcon
export const Moon = MoonIcon
export const MoreHorizontalIcon = EllipsisHorizontalIcon
export const OctagonXIcon = XCircleIcon
export const MenuIcon = Bars3BottomLeftIcon
/** Returns one level up a drill-down stack; a single arrow means "previous". */
export const ChevronsLeft = ChevronDoubleLeftIcon
export const Pencil = PencilSquareIcon
export const Plus = PlusIcon
export const RefreshCw = ArrowPathIcon
export const RectangleGroup = RectangleGroupIcon
export const SearchIcon = MagnifyingGlassIcon
export const Settings = Cog6ToothIcon
export const Shield = ShieldCheckIcon
export const ShieldCheck = ShieldCheckIcon
export const Share2 = ShareIcon
export const Sparkles = SparklesIcon
export const StickyNote = ClipboardDocumentIcon
export const Star = StarIcon
export const Sun = SunIcon
export const SunMoon = SunIcon
export const Terminal = CommandLineIcon
export const Trash = TrashIcon
export const TrendingDown = ArrowTrendingDownIcon
export const TrendingUp = ArrowTrendingUpIcon
export const TriangleAlertIcon = ExclamationTriangleIcon
export const User = UserIcon
export const UserPlus = UserPlusIcon
export const UserRoundCheck = UserCircleIcon
export const Users = UsersIcon
export const Waves = SignalIcon
export const X = XMarkIcon
export const XCircle = XCircleIcon
export const XIcon = XMarkIcon
export const AlertCircle = ExclamationCircleIcon
export const ReceiptText = DocumentTextIcon
export const ReceiptPercent = ReceiptPercentIcon
export const Clock = ClockIcon
export const ArchiveBox = ArchiveBoxIcon
export const Briefcase = BriefcaseIcon
export const BugAnt = BugAntIcon
export const BuildingLibrary = BuildingLibraryIcon
export const Identification = IdentificationIcon
export const Lifebuoy = LifebuoyIcon
export const UserGroup = UserGroupIcon
export const ViewColumns = ViewColumnsIcon

// Sidebar panel icon — matches the Lucide `SidebarIcon` used in fumadocs
export const SidebarPanelIcon = (
  props: React.SVGProps<SVGSVGElement>
): React.ReactElement =>
  React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      'aria-hidden': true,
      ...props,
    },
    React.createElement('rect', {
      width: '18',
      height: '18',
      x: '3',
      y: '3',
      rx: '2',
    }),
    React.createElement('path', { d: 'M9 3v18' })
  )

/**
 * The sidebar toggle. A rounded panel, not three stacked lines: this control
 * shows and hides a docked rail, while a hamburger is the icon for a menu that
 * opens over the page — which is what `MenuIcon` stays for.
 */
export const PanelLeftIcon = SidebarPanelIcon
