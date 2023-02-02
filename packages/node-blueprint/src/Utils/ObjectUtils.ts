import { IKeyValueObject, ISaveableTypes } from "./BaseTypes";

/**
 * 深克隆对象，数组
 * @param obj 要克隆的对象
 * @param deepArray 是否要深度克隆数组里的每个对象
 */
function clone<T extends ISaveableTypes>(obj: T, deepArray = false): T {
  let temp: IKeyValueObject|Array<IKeyValueObject>|null = null;
  if (obj instanceof Array) {
    if (deepArray) {
      temp = (obj as IKeyValueObject[]).map<IKeyValueObject>((item) => clone(item, deepArray) as IKeyValueObject);
    }
    else {
      temp = obj.concat() as Array<IKeyValueObject>;
    }
  }
  else if (typeof obj === 'object') {
    temp = {} as IKeyValueObject;
    for (const item in obj) {
      const val = (obj as IKeyValueObject)[item];
      if (val === null) { temp[item] = null; }
      else if (val) { (temp as IKeyValueObject)[item] = clone(val, deepArray) as ISaveableTypes; }
    }
  } else {
    temp = obj as unknown as IKeyValueObject;
  }
  return temp as unknown as T;
}

export default {
  clone,
};