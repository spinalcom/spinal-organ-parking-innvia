/*
 * Copyright 2021 SpinalCom - www.spinalcom.com
 * 
 * This file is part of SpinalCore.
 * 
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 * 
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 * 
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import { SpinalNode, SpinalContext } from "spinal-env-viewer-graph-service";

export async function findOneInContext(node: SpinalNode<any>, context: SpinalContext<any>,
  predicate: (node: SpinalNode<any>) => boolean,
): Promise<SpinalNode<any>> {
  if (typeof predicate !== 'function') {
    throw new Error('The predicate function must be a function');
  }

  const seen: Set<SpinalNode<any>> = new Set([node]);
  let promises: Promise<SpinalNode<any>[]>[] = [];
  let nextGen: SpinalNode<any>[] = [node];
  let currentGen: SpinalNode<any>[] = [];

  while (nextGen.length) {
    currentGen = nextGen;
    promises = [];
    nextGen = [];

    for (const currNode of currentGen) {
      promises.push(currNode.getChildrenInContext(context));
      if (predicate(currNode)) {
        return (currNode);
      }
    }

    const childrenArrays: SpinalNode<any>[][] = await Promise.all(promises);
    for (const children of childrenArrays) {
      for (const child of children) {
        if (!seen.has(child)) {
          nextGen.push(child);
          seen.add(child);
        }
      }
    }
  }
}