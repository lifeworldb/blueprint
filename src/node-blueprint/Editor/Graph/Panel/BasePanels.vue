<!-- eslint-disable vue/no-v-html -->
<template>
  <!--编辑器内部鼠标悬浮弹出提示-->
  <Teleport :to="teleport">
    <TooltipContent 
      v-if="editorHoverInfoTip.show"
      :x="editorHoverInfoTooltipPos.x"
      :y="editorHoverInfoTooltipPos.y"
      ignoreEvent
      centerContent
      class="node-editor-no-move"
    >
      <template #content>
        <Icon v-if="editorHoverInfoTip.status === 'success'" icon="icon-select-bold" class="text-success mr-1" />
        <Icon v-else-if="editorHoverInfoTip.status === 'failed'" icon="icon-close" class="text-danger mr-1" />
        <span v-html="editorHoverInfoTip.text" />
      </template>
    </TooltipContent>
  </Teleport>
  <!--小信息提示-->
  <div 
    v-show="isShowSmallTip"
    class="node-editor-centertip node-editor-no-move"
    v-html="smallTipText"
  />
  <!--添加节点菜单-->
  <Teleport :to="teleport">
    <AddNodePanel 
      ref="addNodePanel"
      v-model:show="isShowAddNodePanel"
      class="node-editor-no-move"
      :isAddDirectly="isAddDirectly"
      :allNodesGrouped="(allNodesGrouped as CategoryData[])"
      :allNodesFlat="(allNodesFlat as Map<string, CategoryDataItem>)"
      :filterByPortDirection="filterByPortDirection"
      :filterByPortType="filterByPortType"
      :position="(addNodePanelPosition as Vector2)"
      @addNode="onAddNode"
    />
    <SelectTypePanel 
      ref="selectTypePanel"
      v-model:show="isShowSelectTypePanel"
      :position="(selectTypePanelPosition as Vector2)"
      :canBeAny="selectTypePanelCanbeAny"
      :canBeExecute="selectTypePanelCanbeExecute"
      :canBeArrayOrSetOrDict="selectTypePanelCanBeArrayOrSetOrDict"
      class="node-editor-no-move"
      @selectType="onSelectType"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { inject, ref, type PropType, onMounted, watch, reactive } from 'vue';
import { NodeRegistry } from '@/node-blueprint/Base/Flow/Registry/NodeRegistry';
import { Vector2 } from '@/node-blueprint/Base/Utils/Base/Vector2';
import type { NodePortDirection } from '@/node-blueprint/Base/Flow/Node/NodePort';
import type { NodeParamType } from '@/node-blueprint/Base/Flow/Type/NodeParamType';
import type { NodeGraphEditorInternalContext, NodeGraphEditorViewport } from '../NodeGraphEditor';
import type { INodeDefine } from '@/node-blueprint/Base/Flow/Node/Node';
import type { CategoryData, CategoryDataItem } from '@/node-blueprint/Base/Flow/Registry/NodeCategory';
import Icon from '../../Nana/Icon.vue';
import AddNodePanel from './AddNode/AddNodePanel.vue';
import SelectTypePanel from './SelectType/SelectTypePanel.vue';
import Alert, { type AlertProps } from '../../Nana/Modal/Alert';
import { SimpleTimer } from '@/node-blueprint/Base/Utils/Timer/Timer';
import TooltipContent from '../../Nana/Tooltip/TooltipContent.vue';

const context = inject<NodeGraphEditorInternalContext>('NodeGraphEditorContext');
const teleport = inject<string>('NodeGraphUIModalTeleport', 'body');

defineProps({
  viewPort: {
    type: Object as PropType<NodeGraphEditorViewport>,
    default: null
  }
})

//#region 小信息提示

const isShowSmallTip = ref(false);
const smallTipText = ref('');

function showSmallTip(text : string, time = 1300) {
  smallTipText.value = text;
  isShowSmallTip.value = true;
  setTimeout(() => {
    isShowSmallTip.value = false;
  }, time)
}
function closeSmallTip() {
  isShowSmallTip.value = false;
}

//#endregion

//#region 对话框

function showModal(options: AlertProps) {
  Alert.alert(options);
}
function showConfirm(options: AlertProps) {
  return Alert.confirm(options);
}

//#endregion

//#region 鼠标悬浮提示

const editorHoverInfoTip = reactive({
  show: false,
  text: '',
  status: '',
});
const editorHoverInfoTooltipPos = ref(new Vector2());
const updateMousePointTimer = new SimpleTimer(undefined, () => {
  if (context)
    editorHoverInfoTooltipPos.value.set(context.mouseManager.getMouseInfo().mouseCurrentPosScreen);
}, 20);
function showEditorHoverInfoTip(text : string, status: 'success'|'failed'|'' = '') {
  editorHoverInfoTip.show = true;
  editorHoverInfoTip.text = text;
  editorHoverInfoTip.status = status;
  updateMousePointTimer.start();
}
function closeEditorHoverInfoTip () {
  editorHoverInfoTip.show = false;
  updateMousePointTimer.stop();
}

//#endregion

//#region 添加节点菜单

const isShowAddNodePanel = ref(false);
const addNodePanelPosition = ref(new Vector2());
const isAddDirectly = ref(false);
const addNodePos = ref<Vector2>();
const filterByPortType = ref<NodeParamType>();
const filterByPortDirection = ref<NodePortDirection>();
const allNodesGrouped = ref<CategoryData[]>([]); 
const allNodesFlat = ref(new Map<string, CategoryDataItem>()); 


function showAddNodePanel(screenPos: Vector2, _filterByPortType ?: NodeParamType|undefined, _filterByPortDirection ?: NodePortDirection|undefined, _addNodePos ?: Vector2, showAddDirectly ?: boolean): void {
  isAddDirectly.value = showAddDirectly ?? false;
  addNodePos.value = _addNodePos;
  filterByPortType.value = _filterByPortType;
  filterByPortDirection.value = _filterByPortDirection;
  addNodePanelPosition.value.set(screenPos);
  isShowAddNodePanel.value = true;
}

function closeAddNodePanel() {
  isShowAddNodePanel.value = false;
}

function onAddNode(node: INodeDefine) {
  isShowAddNodePanel.value = false;
  context?.userActionsManager.addNode(node, { addNodeInPos: addNodePos.value });
}

watch(isShowAddNodePanel, (show) => {
  if (!show && context)
    context.connectorManager.endConnectToNew();
});

//#endregion

//#region 选择类型菜单

const isShowSelectTypePanel = ref(false);
const selectTypePanelPosition = ref(new Vector2());
const selectTypePanelCanbeExecute = ref(false);
const selectTypePanelCanbeAny = ref(false);
const selectTypePanelCanBeArrayOrSetOrDict = ref(false);
let selectPromiseResolve: ((e: NodeParamType) => void)|undefined = undefined;

function showSelectTypePanel(screenPos: Vector2, canbeExecute: boolean, canbeAny: boolean, canBeArrayOrSetOrDict: boolean) {
  isShowSelectTypePanel.value = true;
  selectTypePanelPosition.value = screenPos;
  selectTypePanelCanbeExecute.value = canbeExecute;
  selectTypePanelCanbeAny.value = canbeAny;
  selectTypePanelCanBeArrayOrSetOrDict.value = canBeArrayOrSetOrDict;
  return new Promise<NodeParamType>((resolve) => {
    selectPromiseResolve = resolve;
  });
}
function closeSelectTypePanel() {
  isShowSelectTypePanel.value = false;
}

function onSelectType(type: NodeParamType) {
  type = type.define?.typeCreate ? type.define.typeCreate(type) : type;
  closeSelectTypePanel();
  if (selectPromiseResolve) {
    selectPromiseResolve(type);
    selectPromiseResolve = undefined;
  }
}

//#endregion

onMounted(() => {
  allNodesGrouped.value = NodeRegistry.getInstance().getAllNodesGrouped();
  allNodesFlat.value = NodeRegistry.getInstance().getAllNodesFlat();

  if (context) {
    //鼠标未拖拽未选择情况下，弹出添加单元菜单
    context.mouseManager.getMouseHandler().pushMouseUpHandlers((info, e) => {
      if (!info.mouseMoved && e.button === 2 && !context.connectorManager.isAnyConnectorHover()) {
        showAddNodePanel(
          info.mouseCurrentPosScreen, 
          undefined,
          undefined,
          info.mouseCurrentPosViewPort.clone(),
          false
        );
        return true;
      }
      return false;
    })
    context.dialogManager = {
      showModal,
      showConfirm,
      showEditorHoverInfoTip,
      closeEditorHoverInfoTip,
      showSelectTypePanel,
      closeSelectTypePanel,
      showAddNodePanel,
      closeAddNodePanel,
      showSmallTip,
      closeSmallTip,
    };
  }
});

</script>
