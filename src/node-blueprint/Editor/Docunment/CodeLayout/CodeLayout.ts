import type { VNode } from "vue";
import { LateClass } from "./Composeable/LateClass";
import type { CodeLayoutLangDefine } from "./Language";

//布局类型定义
export interface CodeLayoutConfig {
  primarySideBarSwitchWithActivityBar: boolean,
  primarySideBarPosition: 'left'|'right',
  primarySideBarWidth: number,
  primarySideBarMinWidth: number,
  secondarySideBarWidth: number,
  secondarySideBarMinWidth: number,
  bottomPanelHeight: number,
  bottomPanelMinHeight: number,
  bottomAlignment: 'left'|'center'|'right'|'justify',
  statusBarHeight: number|string,
  activityBarPosition: 'side'|'top'|'hidden',
  panelHeaderHeight: number,
  panelMinHeight: number,
  titleBar: boolean,
  titleBarShowCustomizeLayout: boolean,

  onResetDefault?: () => void;
  onStartDrag?: (panel: CodeLayoutPanelInternal) => boolean;
  onEndDrag?: (panel: CodeLayoutPanelInternal) => void;
  onDropToGrid?: (panel: CodeLayoutPanelInternal, grid: CodeLayoutGrid) => boolean;
  onDropToPanel?: (
    reference: CodeLayoutPanelInternal,
    referencePosition: CodeLayoutDragDropReferencePosition, 
    panel: CodeLayoutPanelInternal, 
    dropTo: 'normal'|'empty'|'tab-header'|'activiy-bar'
  ) => boolean;
  onGridFirstDrop?: (grid: CodeLayoutGrid, panel: CodeLayoutPanelInternal) => CodeLayoutPanelInternal;
  onGridEmpty?: (grid: CodeLayoutGrid) => void;
  onNoAutoShinkTabGroup?: (group: CodeLayoutPanelInternal) => void,
  onNoAutoShinkNormalGroup?: (group: CodeLayoutPanelInternal) => void,
}
//语言布局定义
export interface CodeLayoutLangConfig {
  lang: string,
  stringsOverride?: Partial<CodeLayoutLangDefine>,
}

export const defaultCodeLayoutConfig : CodeLayoutConfig = {
  primarySideBarSwitchWithActivityBar: true,
  primarySideBarPosition: "left",
  primarySideBarWidth: 20,
  primarySideBarMinWidth: 170,
  activityBarPosition: "side",
  secondarySideBarWidth: 20,
  secondarySideBarMinWidth: 170,
  bottomPanelHeight: 30,
  bottomPanelMinHeight: 40,
  bottomAlignment: 'center',
  statusBarHeight: '20px',
  panelHeaderHeight: 24,
  panelMinHeight: 150,
  titleBar: true,
  titleBarShowCustomizeLayout: true,
}

//用户接口定义

export type CodeLayoutGrid = 'primarySideBar'|'secondarySideBar'|'bottomPanel'|'centerArea'|'none';

export interface CodeLayoutInstance {
  getPanelByName(name: string): CodeLayoutPanelInternal | undefined,
  addGroup: (panel: CodeLayoutPanel, target: CodeLayoutGrid) => CodeLayoutPanel;
  removeGroup(panel: CodeLayoutPanel): CodeLayoutPanel;
  activeGroup: (panel: CodeLayoutPanel) => void;
  closePanel: (panel: CodeLayoutPanel) => void;
  togglePanel: (panel: CodeLayoutPanel) => boolean;
  openPanel: (panel: CodeLayoutPanel, closeOthers?: boolean) => void,
  addPanel: (panel: CodeLayoutPanel, parentGroup: CodeLayoutPanel, active?: boolean) => CodeLayoutPanel;
  removePanel: (panel: CodeLayoutPanel) => CodeLayoutPanel;
  getRootGrid(target: CodeLayoutGrid): CodeLayoutGridInternal,
  relayoutAll: () => void;
  relayoutGroup(name: string): void;
}

//内部类定义

export class CodeLayoutPanelInternal extends LateClass implements CodeLayoutPanel {

  public constructor() {
    super();
  }

  title = '';
  name = '';
  open = false;
  resizeable = false;
  visible = true;
  showBadge = true;
  size = 0;
  children : CodeLayoutPanelInternal[] = [];
  activePanel: CodeLayoutPanelInternal|null = null;
  parentGroup: CodeLayoutPanelInternal|null = null;
  parentGrid: CodeLayoutGrid = 'none';
 
  tooltip?: string;
  badge?: string|(() => VNode)|undefined;
  accept?: CodeLayoutGrid[];
  preDropCheck?: (
    dropPanel: CodeLayoutPanel, 
    targetGrid: CodeLayoutGrid,
    referencePanel?: CodeLayoutPanel|undefined,
    referencePosition?: CodeLayoutDragDropReferencePosition|undefined,
  ) => boolean;
  tabStyle?: CodeLayoutPanelTabStyle;
  noAutoShink = false;
  noHide = false;
  minSize?: number|undefined;
  startOpen?: boolean|undefined;
  iconLarge?: string|(() => VNode)|undefined;
  iconSmall?: string|(() => VNode)|undefined;
  actions?: CodeLayoutActionButton[]|undefined;

  addChild(child: CodeLayoutPanelInternal, index?: number) {
    if (this.name === child.name)
      throw new Error('Try add self');
    if (typeof index === 'number')
      this.children.splice(index, 0, child);
    else
      this.children.push(child);
    child.parentGroup = this;
    child.parentGrid = this.parentGrid;
    if (!this.activePanel)
      this.activePanel = child;
  }
  addChilds(childs: CodeLayoutPanelInternal[], startIndex?: number) {
    if (typeof startIndex === 'number')
      this.children.splice(startIndex, 0, ...childs);
    else
      this.children.push(...childs);
    for (const child of childs) {
      if (this.name === child.name)
        throw new Error('Try add self');
      child.parentGroup = this;
      child.parentGrid = this.parentGrid;
    }
    if (!this.activePanel)
      this.activePanel = this.children[0];
  }
  reselectActiveChild() {
    this.activePanel = this.children.find((p) => p.visible) || null;
  }
  removeChild(child: CodeLayoutPanelInternal) {
    this.children.splice(this.children.indexOf(child), 1);
    child.parentGroup = null;
    //如果被删除面板是激活面板，则选另外一个面板激活
    if (child.name === this.activePanel?.name)
      this.reselectActiveChild();
  }
  replaceChild(oldChild: CodeLayoutPanelInternal, child: CodeLayoutPanelInternal) {
    this.children.splice(
      this.children.indexOf(oldChild), 
      1, 
      child);   
    oldChild.parentGroup = null;
    //如果被删除面板是激活面板，则选另外一个面板激活
    if (this.activePanel?.name === oldChild.name)
      this.activePanel = child;
    child.parentGroup = this;
    child.parentGrid = this.parentGrid;
  }
  hasChild(child: CodeLayoutPanelInternal) {
    return this.children.includes(child);
  }

  lastRelayoutSize = 0;
  lastLayoutSizeCounter = 0;

  getIsTabContainer() {
    return this.tabStyle === 'text' || this.tabStyle === 'icon';
  }
  getIsTopGroup() {
    return !this.parentGroup
  }
  getIsInTab() {
    return this.parentGroup?.getIsTabContainer() ?? false;
  }
  getParent() : CodeLayoutPanelInternal|null {
    return this.parentGroup;
  }
  getIndexInParent() {
    if (this.parentGroup)
      return this.parentGroup.children.indexOf(this) ?? 0;
    return this.getParent()?.children.indexOf(this) ?? 0;
  }
  getLastChildOrSelf() {
    return this.children.length > 0 ? 
      this.children[this.children.length - 1] 
      : this;
  }
  getFlatternChildOrSelf() {
    return this.children.length > 0 ? this.children : [ this ];
  }

  getContainerSize() {
    return this.lastRelayoutSize;
  }
  notifyRelayout() {
    this.pushLateAction('notifyRelayout');
  }
  relayoutAllWithNewPanel(panels: CodeLayoutPanelInternal[]) {
    this.pushLateAction('relayoutAllWithNewPanel', panels);
  }
  relayoutAllWithRemovePanel(panel: CodeLayoutPanelInternal) {
    this.pushLateAction('relayoutAllWithRemovePanel', panel);
  }
  relayoutAllWithResizedSize(resizedContainerSize: number) {
    this.pushLateAction('relayoutAllWithResizedSize', resizedContainerSize);
  }
}
export class CodeLayoutGridInternal extends CodeLayoutPanelInternal {

  public constructor(
    name: CodeLayoutGrid,
    tabStyle: CodeLayoutPanelTabStyle,
    onSwitchCollapse: (open: boolean) => void
  ) {
    super();
    this.name = name;
    this.tabStyle = tabStyle;
    this.parentGrid = name;
    this.onSwitchCollapse = onSwitchCollapse;
  }

  private onSwitchCollapse?: (open: boolean) => void;

  collapse(open: boolean) {
    this.onSwitchCollapse?.(open);
  }
}

export type CodeLayoutPanelTabStyle = 'none'|'single'|'text'|'icon'|'hidden';

//面板用户类型定义
export interface CodeLayoutPanel {
  title: string;
  tooltip?: string;
  name: string;
  badge?: string|(() => VNode)|undefined;
  accept?: CodeLayoutGrid[];
  visible?: boolean;
  showBadge?: boolean;

  /**
   * Custom check callback before this panel drop.
   * @param dropPanel The panel being prepared for drop.
   * @param targetGrid Target grid.
   * @param referencePanel Drop reference panel.
   * @param referencePosition Place position relative to the reference panel.
   * @returns Return true to allow user drop, false to reject.
   */
  preDropCheck?: (
    dropPanel: CodeLayoutPanel, 
    targetGrid: CodeLayoutGrid,
    referencePanel?: CodeLayoutPanel|undefined,
    referencePosition?: CodeLayoutDragDropReferencePosition|undefined,
  ) => boolean;

  /**
   * Set group tab style
   * * none: no tab, use in primary side area
   * * text: tab header only show text
   * * icon: tab header only show icon
   * 
   * Default: 'none'
   */
  tabStyle?: CodeLayoutPanelTabStyle;
  /**
   * Default: false
   */
  noAutoShink?: boolean;
  /**
   * Default: false
   */
  noHide?: boolean;
  size?: number|undefined;
  minSize?: number|undefined;
  startOpen?: boolean|undefined;
  iconLarge?: string|(() => VNode)|undefined;
  iconSmall?: string|(() => VNode)|undefined;
  actions?: CodeLayoutActionButton[]|undefined;
}

//运行时类型定义
export type CodeLayoutDragDropReferencePosition = ''|'drag-over-prev'|'drag-over-next';

export interface CodeLayoutContext {
  dragDropToGrid: (grid: CodeLayoutGrid, panel: CodeLayoutPanelInternal) => void,
  dragDropToPanelNear: (
    reference: CodeLayoutPanelInternal, 
    referencePosition: CodeLayoutDragDropReferencePosition, 
    panel: CodeLayoutPanelInternal, 
    dropTo: 'normal'|'empty'|'tab-header'|'activiy-bar',
  ) => void,
  relayoutAfterToggleVisible: (panel: CodeLayoutPanelInternal) => void,
  relayoutTopGridProp: (grid: CodeLayoutGrid, visible: boolean) => void,
  instance: CodeLayoutInstance;
}

export interface CodeLayoutActionButton {
  name: string,
  icon: string|(() => VNode),
  onClick: () => void,
}