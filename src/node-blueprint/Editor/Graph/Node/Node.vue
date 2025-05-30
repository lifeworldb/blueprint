<template>
  <Tooltip 
    v-if="instance && !nodeExclusionEnable || !instance.exclusionState"
    :enable="!instance.style.noTooltip && instance.style.titleState === 'hide'"
  >
    <template #content>
      <h4>{{ instance.name }}</h4>
      <p v-if="instance.errorState">{{ instance.errorMessage }}</p>
      <p>{{ instance.description }}</p>
    </template>
    <div
      ref="nodeRef"
      :key="instance.uid"
      tabindex="-1"
      :class="['node-block',
               (instance.errorState ? `error-${instance.errorState} ` : ''),
               (instance.selected ? 'selected ' : ''),
               (instance.style.customClassNames),
               (twinkleActive ? 'actived' : ''),
               (instance.isolateState ? 'isolate' : ''),
               (instance.breakpointTriggered ? 'breakpoint-actived' : ''),
               ...appendClass
      ]"
      :style="{
        left: `${instance.position.x}px`,
        top: `${instance.position.y}px`,
        width: (instance.style.userResize === 'width' || instance.style.userResize === 'all') ? (`${instance.customSize.x}px`) : 'auto',
        height: (instance.style.userResize === 'height' || instance.style.userResize === 'all') ? (`${instance.customSize.y}px`) : 'auto',
        minWidth: instance.style.minWidth > 0 ? `${instance.style.minWidth}px` : '',
        minHeight: instance.style.minHeight > 0 ? `${instance.style.minHeight}px` : '',
        maxWidth: instance.style.maxWidth > 0 ? `${instance.style.maxWidth}px` : '',
        maxHeight: instance.style.maxHeight > 0 ? `${instance.style.maxHeight}px` : '',
        cursor: cursor,
      }"
      @mousedown="onMouseDown($event)"
      @mouseenter="onMouseEnter($event)"
      @mouseleave="onMouseLeave($event)"
      @mousemove="onMouseMove($event)"
      @mouseup="onMouseUp($event)"
      @mousewheel="onMouseWhell($event)"
      @contextmenu="onContextmenu($event)"
      @click="onMouseClick($event)"
      @dblclick="onMouseDblclick($event)"
    >
      <!--错误区域-->
      <div
        v-if="instance.errorState" 
        :class="'node-block-error-state ' + instance.errorState"
      >
        <Icon icon="icon-warning-singal" :size="26" />
      </div>
      <!--注释区域-->
      <div
        v-show="instance.markOpen && !instance.style.noComment" 
        class="node-block-comment node-editor-no-move"
        :style="{ top: commentTop }"
      >
        <span ref="commentInputPlaceHolder" class="node-block-comment-place-holder" @click="onCommentInputPlaceHolderClick">点击添加注释</span>
        <div 
          ref="commentInput"
          class="node-block-comment-text node-editor-no-move" 
          contenteditable="true"
          @input="onCommentInputInput"
          @blur="onCommentInputBlur"
          @wheel="onCommentWhell"
        />
        <Tooltip content="隐藏注释气泡">
          <a class="close" @click="closeComment">
            <Icon icon="icon-close-bold" />
          </a>
        </Tooltip>
      </div>
      <Tooltip content="打开注释气泡">
        <a 
          v-show="!instance.markOpen && !instance.style.noComment"
          class="node-block-comment-open" 
          @click="openComment"
        >
          <Icon icon="icon-qipao" />
        </a>
      </Tooltip>
      <!--标题和图标-->
      <Tooltip 
        v-if="instance" 
        :enable="!instance.style.noTooltip"
      >
        <template #content>
          <h4>{{ instance.name }}</h4>
          <p v-if="instance.errorState">{{ instance.errorMessage }}</p>
          <p>{{ instance.description }}</p>
        </template>
        <div 
          :class="'node-block-header state-'+(instance.style.titleState)"
          :style="{
            color: instance.style.titleColor,
            backgroundColor: instance.style.titleBakgroundColor,
          }"
        >
          <NodeIconImageRender 
            v-show="!instance.style.noLogo"
            class="logo" 
            :imageUrlOrIcon="instance.style.logo || DefaultBlockLogo"
            :size="20"
          />
          <div class="title">{{ instance.name }}</div>
          
          <NodeIconImageRender
            class="logo-right"
            :imageUrlOrIcon="instance.style.logoRight"
            :size="32"
          />
          <NodeIconImageRender
            class="logo-bottom"
            :imageUrlOrIcon="instance.style.logoBottom"
            :size="16"
          />
        </div>
      </Tooltip>
      <!--断点指示-->
      <div 
        v-show="instance.breakpoint!=='none'"
        :class="'breakpoint-status'"
      >
        <Icon 
          :icon="(instance.breakpoint==='enable'?'icon-breakpoint-active':
            (instance.breakpoint==='disable'?'icon-breakpoint':''))"
        />
      </div>
      <div 
        v-show="instance.breakpointTriggered"
        class="breakpoint-arrow"
      >
        <Icon icon="icon-arrow-down-filling" :size="32" />
      </div>
      <!--背景-->
      <NodeIconImageRender 
        class="background"
        :imageUrlOrIcon="instance.style.logoBackground"
        :size="instance.style.logoBackgroundSize ?? 55"
        :noContainerSize="true"
      >
        <span 
          v-if="typeof instance.style.logoBackground === 'string' 
            && instance.style.logoBackground.startsWith('title:')"
          class="big-title" 
        >
          {{ instance.style.logoBackground.substring(6) }}
        </span>
      </NodeIconImageRender>
      <!--自定义属性区域（上）-->
      <div v-if="instance.nodeProp?.before" class="node-block-custom-editor node-custom-editor">
        <PropControl :items="instance.nodeProp.before" :mini="true" />
      </div>
      <!--自定义编辑器区域-->
      <NodeCustomEditorWrapper
        :node="instance"
        :create-editor-function="instance.events.onCreateCustomEditor"
      />
      <!--主端口区域-->
      <div v-if="instance.inputPortCount > 0 || instance.outputPortCount > 0" class="node-block-base">
        <div class="node-block-ports">
          <div class="left">
            <NodePort v-for="port in instance.inputPorts" :key="port.guid" :instance="(port as NodePortEditor)" @deletePort="onUserDeletePort" />
            <SmallButton v-if="instance.define.userCanAddInputExecute" icon="icon-add-behavor-port" @click="onUserAddPort('input', 'execute')">添加引脚</SmallButton>
            <SmallButton v-if="instance.define.userCanAddInputParam" icon="icon-add-bold" @click="onUserAddPort('input', 'param')">添加参数</SmallButton>
          </div>
          <div class="right">
            <NodePort v-for="port in instance.outputPorts" :key="port.guid" :instance="(port as NodePortEditor)" @deletePort="onUserDeletePort" />
            <SmallButton v-if="instance.define.userCanAddOutputExecute" icon="icon-add-behavor-port" iconPlace="after" @click="onUserAddPort('output', 'execute')">添加引脚</SmallButton>
            <SmallButton v-if="instance.define.userCanAddOutputParam" icon="icon-add-bold" iconPlace="after" @click="onUserAddPort('output', 'param')">添加参数</SmallButton>
          </div>
        </div>
      </div>
      <!--自定义属性区域（下）-->
      <div v-if="instance.nodeProp?.after" class="node-custom-editor">
        <PropControl :items="instance.nodeProp.after" :mini="true" />
      </div>
      <!--右下角拖拽-->
      <div v-if="instance.style.userResize" class="node-size-dragger" />
    </div>
  </Tooltip>
</template>

<script lang="ts" setup>
import { ref, toRefs, type PropType, inject, nextTick, onBeforeUnmount } from 'vue';
import Tooltip from '../../Nana/Tooltip/Tooltip.vue';
import Icon from '../../Nana/Icon.vue';
import NodePort from './NodePort.vue';
import SmallButton from '../../Components/SmallButton.vue';
import NodeIconImageRender from './NodeIconImageRender.vue';
import StringUtils from '@/node-blueprint/Base/Utils/StringUtils';
import DefaultBlockLogo from '../../Images/BlockIcon/function.svg'
import NodeCustomEditorWrapper from './NodeCustomEditorWrapper.vue';
import PropControl from '../../Components/PropControl/PropControl.vue';
import type { ChunkedPanel } from '../Cast/ChunkedPanel';
import type { NodeGraphEditorInternalContext, NodeGraphEditorViewport } from '../NodeGraphEditor';
import type { NodePortDirection } from '@/node-blueprint/Base/Flow/Node/NodePort';
import type { NodePortEditor } from '../Flow/NodePortEditor';
import type { NodeEditor } from '../Flow/NodeEditor';
import { Vector2 } from '@/node-blueprint/Base/Utils/Base/Vector2';
import { SIZE_LEFT, SIZE_TOP, SIZE_BOTTOM, SIZE_RIGHT } from './NodeDefines';
import { createMouseDragHandler } from '../Editor/MouseHandler';
import { isMouseEventInNoDragControl } from '../Editor/EditorMouseHandler';
import { printWarning } from '@/node-blueprint/Base/Logger/DevLog';
import { useResizeChecker } from 'vue-code-layout';
import { moveNodeSolveSnap } from '../Composeable/NodeMove';
import { useComponentLoadBoundThing } from '../../Composeable/ComponentLoadBoundThing';

const props = defineProps({
  instance: {
    type: Object as PropType<NodeEditor>,
    required: true,
  },
  viewPort: {
    type: Object as PropType<NodeGraphEditorViewport>,
    default: null,
  },
  chunkedPanel: {
    type: Object as PropType<ChunkedPanel>,
    default: null,
  },
  nodeExclusionEnable: {
    type: Boolean,
    default: true,
  },
});
const {
  instance,
  viewPort,
  chunkedPanel,
} = toRefs(props);

const context = inject('NodeGraphEditorContext') as NodeGraphEditorInternalContext;

const TAG = 'Node';
const cursor = ref('');
const appendClass = ref<string[]>([]);
const nodeRef = ref<HTMLDivElement>();

//初始化

onBeforeUnmount(() => {
  stopResizeChecker();
});

useComponentLoadBoundThing(instance, (ins) => {
  //加载节点
  ins.editorHooks.callbackGetRealSize = getRealSize;
  ins.editorHooks.callbackTwinkle = twinkle;
  ins.editorHooks.callbackGetCurrentSizeType = getCurrentSizeType;
  ins.editorHooks.callbackUpdateNodeForMoveEnd = updateNodeForMoveEnd;
  ins.editorHooks.callbackUpdateComment = updateComment;
  ins.editorHooks.callbackGetLastMovedBlock = () => lastMovedBlock;
  ins.editorHooks.callbackDoAutoResizeCheck = function () {
    if (nodeRef.value) {
      const w = nodeRef.value.offsetWidth;
      const h = nodeRef.value.offsetHeight;
      if (w !== lastCheckSizeW || h !== lastCheckSizeH)
        updateRegion();
    }
  };
  ins.editorHooks.callbackOnAddToEditor = () => {
    ins.chunkInfo.data = ins.uid;
    chunkedPanel.value.addInstance(ins.chunkInfo);
    updateRegion();
  };
  ins.editorHooks.callbackRequireContext = () => context;
  ins.editorHooks.callbackUpdateRegion = updateRegion;
  ins.editorHooks.callbackOnRemoveFromEditor = () => {
    chunkedPanel.value.removeInstance(ins.chunkInfo);
  };
  ins.editorHooks.callbackAddClass = (cls) => {
    appendClass.value.push(cls);
  };
  nextTick(() => {
    const ret = ins.events.onEditorCreate?.(ins, context, nodeRef.value);
    if (ret && typeof ret === 'object') {
      ins.editorProp = ret.editorProp;
      ins.nodeProp = ret.nodeProp;
      ins.menu = ret.menu;
    }
    if (ins.style.noIsolate)
      ins.isolateState = false;
    updateComment();
    updateRegion();
    startResizeChecker();
  });
}, (ins) => {
  ins.editorHooks.callbackGetRealSize = null;
  ins.editorHooks.callbackTwinkle = null;
  ins.editorHooks.callbackGetCurrentSizeType = null;
  ins.editorHooks.callbackUpdateNodeForMoveEnd = null;
  ins.editorHooks.callbackUpdateComment = null;
  ins.editorHooks.callbackGetLastMovedBlock = null;
  ins.editorHooks.callbackDoAutoResizeCheck = null;
  ins.editorHooks.callbackOnAddToEditor = null;
  ins.editorHooks.callbackRequireContext = null;
  ins.editorHooks.callbackUpdateRegion = null;
  ins.editorHooks.callbackOnRemoveFromEditor = null;
  ins.editorHooks.callbackAddClass = null;
});

//#region 单元大小更改后重新布局

const {
  startResizeChecker,
  stopResizeChecker,
} = useResizeChecker(
  nodeRef,
  undefined, undefined,
  () => {
    updateRegion();
  }
);

//#endregion

//#region 区块大小与区块功能

let lastCheckSizeW = 0, lastCheckSizeH = 0;

/**
 * 获取真实节点大小
 */
function getRealSize() {
  if(nodeRef.value)
    return new Vector2(nodeRef.value.offsetWidth, nodeRef.value.offsetHeight);
  return new Vector2();
}
/**
 * 更新单元编辑器区块信息。在更改位置、大小之后必须调用才能让区块检测器正常检测。
 */
function updateRegion() {
  const realSize = getRealSize();
  const chunkInfo = instance.value.chunkInfo;

  if (nodeRef.value) {
    lastCheckSizeW = nodeRef.value.offsetWidth;
    lastCheckSizeH = nodeRef.value.offsetHeight;
  }

  chunkInfo.rect.set( 
    instance.value.position.x,
    instance.value.position.y,
    realSize.x,
    realSize.y,
  );
  chunkedPanel.value.updateInstance(chunkInfo);

  //同时更新连接到节点的连接线位置
  instance.value.connectors.forEach((c) => {
    if (c.chunkInfo) {
      c.chunkInfo.rect.set(c.updateRegion());
      chunkedPanel.value.updateInstance(c.chunkInfo);
    }
  });
}
/**
 * 单元位置或大小更改，刷新单元
 */
function updateNodeForMoveEnd() {
  //移动后更新区块
  updateRegion();
  //如果有选择其他块，则同时更新区块
  const selectedNodes = context.selectionManager.getSelectNodes();
  for (const n of selectedNodes) {
    const node = n as NodeEditor;
    if (node !== instance.value) {
      node.saveLastNodePos();
      node.editorHooks.callbackUpdateRegion?.();
    }
  }
}

//#endregion

//#region 闪烁

let timerTwinkle = 0;
const twinkleActive = ref(false);

function twinkle(time: number) {
  //闪烁
  if(timerTwinkle > 0) clearInterval(timerTwinkle);
  timerTwinkle = setInterval(() => twinkleActive.value = !twinkleActive.value, 200) as unknown as number;
  setTimeout(() => {
    twinkleActive.value = false;
    clearInterval(timerTwinkle);
    timerTwinkle = 0;
  }, time);
}

//#endregion

//#region 注释操作

const commentTop = ref('');
const commentInput = ref<HTMLDivElement>();
const commentInputPlaceHolder = ref<HTMLDivElement>();

function updateComment() {
  if(instance.value.style.noComment) 
    return;
  if(commentInput.value && commentInputPlaceHolder.value) {
    commentInput.value.innerText = instance.value.markContent;
    commentInputPlaceHolder.value.style.display = StringUtils.isNullOrBlank(instance.value.markContent) ? '' : 'none';
  }
  setTimeout(() => onCommentInputInput(), 200);
}
function onCommentInputPlaceHolderClick() {
  if(commentInputPlaceHolder.value) commentInputPlaceHolder.value.style.display = 'none';
  if(commentInput.value) commentInput.value.focus();
}
function onCommentInputInput() {
  if(commentInput.value) 
    commentTop.value = -(commentInput.value.offsetHeight - 23 + 40) + 'px';
}
function onCommentInputBlur() {
  if(commentInput.value && instance.value) {
    instance.value.markContent = commentInput.value.innerText;
    updateComment();
  }
}
function onCommentWhell(e: WheelEvent) {
  e.preventDefault();
}
function closeComment() {
  instance.value.markOpen = false;
  updateComment();
}
function openComment() {
  instance.value.markOpen = true;
  updateComment();
}

//#endregion

//#region 调整大小
  
let lastResized = false;
let currentSizeType = 0;

function updateCursor() {
  if(currentSizeType > 0) {
    if(
      (((currentSizeType & SIZE_LEFT) === SIZE_LEFT) && ((currentSizeType & SIZE_TOP) === SIZE_TOP))
      || (((currentSizeType & SIZE_BOTTOM) === SIZE_BOTTOM) && ((currentSizeType & SIZE_RIGHT) === SIZE_RIGHT))
    )
      cursor.value = 'nwse-resize';
    else if(
      (((currentSizeType & SIZE_LEFT) === SIZE_LEFT) && ((currentSizeType & SIZE_BOTTOM) === SIZE_BOTTOM))
      || (((currentSizeType & SIZE_TOP) === SIZE_TOP) && ((currentSizeType & SIZE_RIGHT) === SIZE_RIGHT))
    )
      cursor.value = 'nesw-resize';
    else if(((currentSizeType & SIZE_TOP) === SIZE_TOP) || ((currentSizeType & SIZE_BOTTOM) === SIZE_BOTTOM))
      cursor.value = 'ns-resize';
    else if(((currentSizeType & SIZE_LEFT) === SIZE_LEFT) || ((currentSizeType & SIZE_RIGHT) === SIZE_RIGHT))
      cursor.value = 'ew-resize';
    else 
      cursor.value = 'default';
  } else if(mouseDown) {
    cursor.value = 'move';
  } else {
    cursor.value = 'default';
  }
}
function testInResize(e : MouseEvent) {

  const _instance = instance.value;
  const pos = new Vector2();
  const size = getRealSize();

  viewPort.value.screenPointToViewportPoint(new Vector2(e.x, e.y), pos);
  pos.substract(_instance.position);

  currentSizeType = 0;
  if(pos.x >= 0 && pos.y >= 0 && pos.x <= size.x + 3 && pos.y <= size.y + 3) {
    if(pos.x <= 6) currentSizeType |= SIZE_LEFT;
    else if(pos.x > size.x - 6) currentSizeType |= SIZE_RIGHT;
    if(pos.y <= 6) currentSizeType |= SIZE_TOP;
    else if(pos.y > size.y - 6) currentSizeType |= SIZE_BOTTOM;

    if(pos.x >= size.x - 20 && pos.y >= size.y - 20)
      currentSizeType |= (SIZE_BOTTOM | SIZE_RIGHT);
  }

  updateCursor();

  return currentSizeType > 0;
}
function getCurrentSizeType() { return currentSizeType; }

function onMouseResize(e : MouseEvent) {
  if(currentSizeType) { 
    const _instance = instance.value; 
    const lastBlockPos = _instance.lastBlockPos;
    const lastBlockSize = _instance.lastBlockSize;
    const size = new Vector2(_instance.customSize.x, _instance.customSize.y);
    const mousePos = new Vector2();
    viewPort.value.screenPointToViewportPoint(new Vector2(e.x, e.y), mousePos);

    if (((currentSizeType & SIZE_LEFT) === SIZE_LEFT) && ((currentSizeType & SIZE_TOP) === SIZE_TOP)) {
      //左上
      size.x = (lastBlockPos.x + lastBlockSize.x - mousePos.x);
      size.y = (lastBlockPos.y + lastBlockSize.y - mousePos.y);
      _instance.position = mousePos;
    }
    else if(((currentSizeType & SIZE_BOTTOM) === SIZE_BOTTOM) && ((currentSizeType & SIZE_RIGHT) === SIZE_RIGHT)) {
      //右下
      size.x = (mousePos.x - lastBlockPos.x);
      size.y = (mousePos.y - lastBlockPos.y);
    }
    else if (((currentSizeType & SIZE_LEFT) === SIZE_LEFT) && ((currentSizeType & SIZE_BOTTOM) === SIZE_BOTTOM)) {
      //左下
      size.x = (lastBlockSize.x + lastBlockSize.x - mousePos.x);
      size.y = (mousePos.y - lastBlockPos.y);
      _instance.position = new Vector2(mousePos.x, _instance.position.y);
    }
    else if (((currentSizeType & SIZE_TOP) === SIZE_TOP) && ((currentSizeType & SIZE_RIGHT) === SIZE_RIGHT)) {
      //右上
      size.x = (mousePos.x - lastBlockPos.x);
      size.y = (lastBlockPos.y + lastBlockSize.y - mousePos.y);
      _instance.position = new Vector2(_instance.position.x, mousePos.y);
    }
    else if((currentSizeType & SIZE_TOP) === SIZE_TOP)  {
      //上
      size.y = (lastBlockPos.y + lastBlockSize.y - mousePos.y);
      _instance.position = new Vector2(_instance.position.x, mousePos.y);
    }
    else if((currentSizeType & SIZE_BOTTOM) === SIZE_BOTTOM) {
      //下
      size.y = (mousePos.y - lastBlockPos.y);
    }
    else if((currentSizeType & SIZE_LEFT) === SIZE_LEFT) {
      //左
      size.x = (lastBlockPos.x + lastBlockSize.x - mousePos.x);
      _instance.position = new Vector2(mousePos.x, _instance.position.y);
    }
    else if((currentSizeType & SIZE_RIGHT) === SIZE_RIGHT) {
      //右
      size.x = (mousePos.x - lastBlockPos.x);
    }            
    
    if(size.x < _instance.style.minWidth) size.x = _instance.style.minWidth;
    if(size.y < _instance.style.minHeight) size.y = _instance.style.minHeight;

    _instance.customSize = size;
    lastResized = true;

    return true;
  }
  return false;
}
const resizeMouseHandler = createMouseDragHandler({
  onDown(e) {
    lastResized = false;
    mouseDown = true;
    if(e.buttons === 1)
      return testInResize(e);
    return false;
  },
  onMove(downPos, movedPos, e) {
    lastResized = true;
    onMouseResize(e);
  },
  onUp() {
    mouseDown = false;
    //大小更改后更新区块
    if(lastResized || !getRealSize().equal(instance.value.lastBlockSize)) {
      updateRegion();
    }
  }
});

//#endregion

//#region 鼠标事件

let mouseDown = false;
let lastMovedBlock = false;

const mouseInfo = context.mouseManager.getMouseInfo();

const dragMouseHandler = createMouseDragHandler({
  onDown() {
    lastResized = false;
    mouseDown = true;
    context.viewPortManager.recordViewportPosition();
    return true;
  },
  onMove(downPos, movedPos, e) {
    if(!mouseDown)
      return;
    
    if(e.buttons === 1) {
      context.viewPortManager.moveViewportWithCursorPosition(mouseInfo.mouseCurrentPosEditor);

      const movedScaledDistance = new Vector2(
        (viewPort.value.scaleScreenSizeToViewportSize(movedPos.x)),
        (viewPort.value.scaleScreenSizeToViewportSize(movedPos.y))
      );
      const pos = new Vector2(instance.value.lastBlockPos);
      pos.add(movedScaledDistance);
      pos.add(context.viewPortManager.getViewportMovedPosition());

      //吸附最小刻度
      moveNodeSolveSnap(context, instance.value, pos);

      if(pos.x !== instance.value.position.x || pos.y !== instance.value.position.y) {

        if(!instance.value.selected) {
          //如果当前块没有选中，在这里切换选中状态
          context.selectionManager.selectNode(instance.value, context.keyboardManager.isKeyControlDown() ? true : false);
        }
        else {
          //选中后，如果有选择其他块，则同时移动其他块
          const selectedNodes = context.selectionManager.getSelectNodes();
          for (const node of selectedNodes) {
            if (node !== instance.value) {
              const posOfThisBlock = new Vector2((node as NodeEditor).lastBlockPos);
              posOfThisBlock.add(movedScaledDistance);
              posOfThisBlock.add(context.viewPortManager.getViewportMovedPosition());
              moveNodeSolveSnap(context, node, posOfThisBlock);
              node.position.set(posOfThisBlock)
              node.events.onEditorMoveEvent?.(instance.value, context, posOfThisBlock.substract((node as NodeEditor).lastBlockPos));
            }
          }
        }

        //移动
        lastMovedBlock = true;
        instance.value.position.set(pos);
        instance.value.events.onEditorMoveEvent?.(instance.value, context, pos.substract(instance.value.lastBlockPos));

        //同时更新连接到节点的连接线位置
        instance.value.connectors.forEach((c) => {
          if (c.chunkInfo) {
            c.chunkInfo.rect.set(c.updateRegion());
            chunkedPanel.value.updateInstance(c.chunkInfo);
          }
        });
      }
    }
  },
  onUp() {
    mouseDown = false;

    if (lastMovedBlock) {
      updateNodeForMoveEnd();
    } else {
      //未移动则检查/如果当前块没有选中，在这里切换选中状态
      if (!props.instance.selected)
        context.selectionManager.selectNode(instance.value, context.keyboardManager.isKeyControlDown() ? true : false);
    }
  },
})

function onMouseDown(e : MouseEvent) {
  lastMovedBlock = false;
  instance.value.saveLastNodePos();
  instance.value.lastBlockSize.set(getRealSize());

  if (isMouseEventInNoDragControl(e))
    return;
  if (instance.value.style.userResize && resizeMouseHandler(e))
    return;
  if (instance.value.events.onEditorMoseEvent?.(instance.value, context, 'down', e))
    return;
  if (dragMouseHandler(e))
    return;

  updateCursor();
  e.stopPropagation();
}
function onMouseWhell(e : WheelEvent) {
  if(isMouseEventInNoDragControl(e)) 
    e.stopPropagation();
}
function onMouseMove(e : MouseEvent) { 
  if (instance.value.events.onEditorMoseEvent?.(instance.value, context, 'move', e))
    return;
  if (!mouseDown) {
    if(instance.value.style.userResize) 
      testInResize(e);
    return;
  }
}
function onMouseUp(e : MouseEvent) { 
  instance.value.events.onEditorMoseEvent?.(instance.value, context, 'up', e);
}
function onMouseEnter(e : MouseEvent) {
  instance.value.events.onEditorMoseEvent?.(instance.value, context, 'enter', e);
}
function onMouseLeave(e : MouseEvent) {
  instance.value.events.onEditorMoseEvent?.(instance.value, context, 'leave', e);
}
function onMouseClick(e : MouseEvent) {
  instance.value.events.onEditorClickEvent?.(instance.value, context, 'click', e);
}
function onMouseDblclick(e : MouseEvent) {
  instance.value.events.onEditorClickEvent?.(instance.value, context, 'dblclick', e);
}

//#endregion

//#region 右键菜单

function onContextmenu(e : MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  context.contextMenuManager.showNodeRightMenu(instance.value, new Vector2(e.x, e.y));
  return false;
}

//#endregion

//#region 添加/删除端口

//添加端口
async function onUserAddPort(direction : NodePortDirection, type : 'execute'|'param') {
  const ret = props.instance.events.onUserAddPort?.(props.instance, context, { direction, type });
  if (typeof ret === 'undefined') {
    printWarning(TAG, null, `Faild to execute onUserAddPort, events.onUserAddPort configue not right.`);
    return;
  }
  const ports = ret instanceof Promise ? await ret : ret;
  if (ports) {
    for (const port of ports)
      props.instance.addPort(port, true);
  }
}
//删除端口
async function onUserDeletePort(port : NodePortEditor) {
  context.userActionsManager.deletePort(port);
}

//#endregion 

</script>