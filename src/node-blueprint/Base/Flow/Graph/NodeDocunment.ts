import RandomUtils from "../../Utils/RandomUtils";
import { SerializableObject } from "../../Utils/Serializable/SerializableObject";
import { NodeGraph, type INodeGraphDefine } from "./NodeGraph";

/**
 * 蓝图文档定义
 */
export class NodeDocunment extends SerializableObject<INodeDocunmentDefine> {
  constructor(define?: INodeDocunmentDefine, isEditor?: boolean) {
    super('NodeDocunment', define, {
      serializableProperties: [
        'uid',
        'name',
        'comment',
        'mainGraph',
      ],
      afterLoad: () => {
        if (!this.uid)
          this.uid = RandomUtils.genNonDuplicateIDHEX(16);
      },
    });
    this.isEditor = isEditor === true;
  }

  /**
   * 名称
   */
  uid = '';
  /**
   * 名称
   */
  name = '';
  /**
   * 版本
   */
  version = '1.0';
  /**
   * 说明
   */
  description = '';
  /**
   * 作者
   */
  author = '';
  /**
   * 注释
   */
  comment = '';
  /**
   * 主图表
   */
  mainGraph : NodeGraph|null = null;
  /**
   * 是否是编辑器模式
   */
  isEditor = false;
  /**
   * 文件所在位置
   */
  path = '';
  /**
   * 提示文件是否在编辑器更改过但没有保存
   */
  fileChanged = false;

  /**
   * 新建文档初始化
   */
  public initNew() {
    this.mainGraph = new NodeGraph({
      type : 'main',
      name : '主图表',
      version : '1.0',
      description : '主图表是整个程序的入口',
      author : this.author,
    }, this.isEditor);
    this.mainGraph.initNew();
  }
  /**
   * 通过UID查找子图表
   * @param uid 子图表UID
   * @returns 
   */
  public findChildGraph(uid : string) {
    if(!this.mainGraph)
      return null;
    let loopChild = function(graph : NodeGraph) : NodeGraph|null {
      let children = graph.children;
      for (let index = 0, c = children.length; index < c; index++) {
        let item = graph.children[index];
        if(item.uid === uid)
          return item;
        else if(item.children.length > 0)
          return loopChild(item);
      }
      return null;
    }
    if(this.mainGraph.uid === uid)
      return this.mainGraph;
    return loopChild(this.mainGraph);
  }
}

export interface INodeDocunmentDefine {
  uid ?: string,
  /**
   * 名称
   */
  name ?: string,
  /**
   * 版本
   */
  version ?: string,
  /**
   * 说明
   */
  description ?: string,
  /**
   * 作者
   */
  author ?: string,
  /**
   * 注释
   */
  comment ?: string,
  /**
   * 主图表
   */
  mainGraph ?: INodeGraphDefine|null,
}