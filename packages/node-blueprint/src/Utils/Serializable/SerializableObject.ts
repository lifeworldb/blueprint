import { IKeyValueObject, ISaveableTypes } from "../BaseTypes";

const createObjectFactorys = new Map<string, () => SerializableObject<IKeyValueObject>>();

/**
 * SerializableObject Object Creation Factory
 */
export const CreateObjectFactory = {
  /**
   * Add to factory
   * @param name Object Name
   * @param createFn Create callback
   */
  addObjectFactory(name : string, createFn : () => SerializableObject<IKeyValueObject>) : void {
    createObjectFactorys.set(name, createFn);
  },
  /**
   * Create SerializableObject from data Object
   * @param name Object Name
   * @param k data Object
   * @returns 
   */
  createSerializableObject<T>(name : string, k : T) : SerializableObject<T>|null {
    const objCreate = createObjectFactorys.get(name);
    if(objCreate) {
      const obj = objCreate() as SerializableObject<T>;
      return obj.load(k);
    }
    return null;
  }
}

/**
 * Serializable Object. It can automatically recursively save class data or deserialize and load it.
 */
export class SerializableObject<T> {

  /**
   * Create SerializableObject
   * @param saveClassName Class name, same as object name when register in `addObjectFactory`.
   * @param define Inittal source data
   */
  constructor(saveClassName: string, define?: T) {
    this.saveClassName = saveClassName;
    if (define) {
      this.load(define);
      this.define = define;
    }
  }

  /**
   * Class name, same as object name when register in `addObjectFactory`.
   */
  saveClassName = '';
  /**
   * Properties that can be saved
   */
  serializableProperties : string[] = [];
  /**
   * Properties that can not be saved
   */
  noSerializableProperties : string[] = [ 'define' ];
  /**
   * The source define data
   */
  define: T|null = null;
  
  private saveProp(element: unknown) : unknown {
    if(typeof element === 'bigint' 
      || typeof element === 'number' 
      || typeof element === 'boolean' 
      || typeof element === 'string'
    )
      return element as ISaveableTypes;
    else if(element && typeof element === 'object') {
      if (element instanceof Array) {
        //This is array
        return element.map(src => this.saveProp(src));
      }
      else if (element instanceof SerializableObject) {
        //This is a SerializableObject
        const serializableObject = element as unknown as SerializableObject<T>;
        if (typeof serializableObject.save === 'function'
          && typeof serializableObject.load === 'function'
          && typeof serializableObject.saveClassName === 'string'
        ) 
          return {
            class: serializableObject.saveClassName,
            obj: serializableObject.save()
          }
      }
    }
    return undefined;
  }
  private loadProp(element: IKeyValueObject) : unknown {
    if (typeof element === 'bigint'
      || typeof element === 'number'
      || typeof element === 'boolean'
      || typeof element === 'string'
    )
      return element;
    else if(element && typeof element === 'object') {
      if (element instanceof Array) {
        //This is array
        return element.map(k => this.loadProp(k));
      }
      else if (typeof element.class === 'string' && typeof element.obj === 'object') {
        //This is a SerializableObject
        return CreateObjectFactory.createSerializableObject(element.class, element.obj as IKeyValueObject);
      }
    }

    return undefined;
  }

  /**
   * 获取是否许可序列化所有属性
   */
  get isSaveAll() {
    return this.serializableProperties.length === 1
      && this.serializableProperties[0] === 'all';
  }

  /**
   * Save this object as a key value object.
   * @returns 
   */
  save() : IKeyValueObject {
    const isAll = this.isSaveAll;
    const o : IKeyValueObject = {}
    for (const key in this) {
      if(this.noSerializableProperties.includes(key) || (!isAll && !this.serializableProperties.includes(key)))
        continue;
      o[key] = this.saveProp(this[key]) as ISaveableTypes;
    }
    return o;
  }
  /**
   * Load this object from the key value object.
   * @param data 
   * @returns Return this 
   */
  load(data : T) : SerializableObject<T> {
    if(data) {
      this.define = data;
      const isAll = this.isSaveAll;
      const o : IKeyValueObject = this as unknown as IKeyValueObject;
      for (const key in data) {
        if(this.noSerializableProperties.includes(key) || (!isAll && !this.serializableProperties.includes(key)))
          continue;
        const value = this.loadProp(data[key] as IKeyValueObject) as IKeyValueObject;
        o[key] = value !== undefined ? value : o[key];
      }
    }
    return this;
  }
}
