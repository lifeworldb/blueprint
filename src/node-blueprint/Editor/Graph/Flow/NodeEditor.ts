import { Node, type INodeDefine } from "@/node-blueprint/Base/Flow/Node/Node";
import { Vector2 } from "@/node-blueprint/Base/Utils/Base/Vector2";
import { ChunkInstance } from "../Cast/ChunkedPanel";
import type { NodeConnectorEditor } from "./NodeConnectorEditor";
import { Rect } from "@/node-blueprint/Base/Utils/Base/Rect";

/**
 * [仅编辑器] 编辑器使用的节点相关数据类
 */
export class NodeEditor extends Node {

  constructor(define: INodeDefine) {
    super(define);
    this.forceSerializableClassProperties.ports = 'NodePortEditor';
    this.noSerializableProperties.push(
      'mouseConnectingPort',
      'selected',
      'breakpointTriggered',
      'chunkInfo',
      'connectors',
      'lastBlockPos',
      'lastBlockSize',
      'editorHooks',
    );
    this.load(define);
  }

  /**
   * 钩子，仅供编辑器使用
   */
  public editorHooks = {
    callbackUpdateNodeForMoveEnd: null as null|(() => void),
    callbackUpdateRegion: null as null|(() => void),
    callbackOnAddToEditor: null as null|(() => void),
    callbackOnRemoveFromEditor: null as null|(() => void),
    callbackGetRealSize: null as null|(() => Vector2),
    callbackGetCurrentSizeType: null as null|(() => number),
    callbackGetLastMovedBlock: null as null|(() => boolean),
    callbackTwinkle: null as null|((time: number) => void),
    callbackAddClass: null as null|((className: string) => void),
  };

  public mouseConnectingPort = false;
  public selected = false;
  public breakpointTriggered = false;
  public chunkInfo = new ChunkInstance(undefined, 'node');
  public connectors = [] as NodeConnectorEditor[];
  public lastBlockPos = new Vector2();
  public lastBlockSize = new Vector2();
  
  /**
   * 保存块当前位置，以供移动使用
   */
  public saveLastNodePos() {
    this.lastBlockPos.set(this.position);
  }
  /**
   * 在单元的大小或者位置变化后，更新区块信息，保证用户多选可以选择
   */
  public updateRegion() {
    this.editorHooks.callbackUpdateRegion?.();
  }
  /**
   * 获取自上次鼠标按下后，用户是否移动了单元
   */
  public getLastMovedBlock() {
    return this.editorHooks.callbackGetLastMovedBlock?.() || false;
  }

  //通用函数

  public addClass(className: string) {
    this.editorHooks.callbackAddClass?.(className);
  }
  /**
   * 触发闪烁
   * @param time 闪烁时长，毫秒
   */
  public twinkle(time = 1000) {
    this.editorHooks.callbackTwinkle?.(time);
  }
  /**
   * 获取当前单元移动之前的位置
   * @returns 
   */
  public getLastPos() {
    return this.lastBlockPos;
  }
  /**
   * 获取节点矩形（视口坐标）
   */
  public getRect() {
    return new Rect().setPos(this.position).setSize(this.getRealSize());
  }
  /**
   * 获取节点真实大小
   */
  public getRealSize() {
    return this.editorHooks.callbackGetRealSize?.() || this.customSize;
  }
  /**
   * 获取单元当前调整大小类型
   * @returns 
   */
  public getCurrentSizeType() : number  {
    return this.editorHooks.callbackGetCurrentSizeType?.() || 0;
  }
}