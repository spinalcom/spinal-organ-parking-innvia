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

import moment = require('moment');
import {
  SpinalContext,
  SpinalGraph,
  SpinalGraphService,
  SpinalNode,
  SpinalNodeRef,
  SPINAL_RELATION_PTR_LST_TYPE
} from 'spinal-env-viewer-graph-service';

import type OrganConfigModel from '../../../model/OrganConfigModel';

import {AxiosInstance} from 'axios';
import { NetworkService } from "spinal-model-bmsnetwork";
//import {InputDataDevice } from "../../../model/InputData/InputDataModel/InputDataDevice"
//import { InputDataEndpoint } from '../../../model/InputData/InputDataModel/InputDataEndpoint';
import {
  InputDataDevice,
  InputDataEndpoint,
  InputDataEndpointGroup,
  InputDataEndpointDataType,
  InputDataEndpointType,
} from '../../../model/InputData/InputDataModel/InputDataModel';
import { axiosInstance } from '../../../utils/axiosInstance';
/**
 * Main purpose of this class is to pull tickets from client.
 *
 * @export
 * @class SyncRunPull
 */
export class SyncRunPull {
  graph: SpinalGraph<any>;
  config: OrganConfigModel;
  interval: number;
  running: boolean;
  mapBuilding: Map<number, string>;
  axiosInstance : AxiosInstance;
  clientBuildingId : number;
  nwService : NetworkService;
  private devices : SpinalNode[];

  constructor(graph: SpinalGraph<any>, config: OrganConfigModel, nwService :NetworkService) {
    this.graph = graph;
    this.config = config;
    this.running = false;
    this.nwService = nwService;
    this.devices = [];
  }

  async getSpinalGeo(): Promise<SpinalContext<any>> {
    const contexts = await this.graph.getChildren();
    for (const context of contexts) {
      if (context.info.id.get() === this.config.spatialContextID?.get()) {
        // @ts-ignore
        SpinalGraphService._addNode(context);
        return context;
      }
    }
    const context = await this.graph.getContext('spatial');
    if (!context) throw new Error('Context Not found');
    return context;
  }

  

  async getContext(): Promise<SpinalNode<any>> {
    const contexts = await this.graph.getChildren();
    for (const context of contexts) {
      //if (context.info.id.get() === this.config.contextId.get()) {
        if (context.info.name.get() === "NetworkInnvia") {
        // @ts-ignore
        SpinalGraphService._addNode(context);
        return context;
      }
    }
    throw new Error('Context Not found');
  }

  private waitFct(nb: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(
        () => {
          resolve();
        },
        nb >= 0 ? nb : 0
      );
    });
  }

  /**
   * Initialize the context (fill the SpinalGraphService)
   *
   * @return {*}  {Promise<void>}
   * @memberof SyncRunPull
   */
  async initContext(): Promise<void> {
    const context = await this.getContext();
    await context.findInContext(context, (node): false => {
      // @ts-ignore
      SpinalGraphService._addNode(node);
      return false;
    });
  }


  async createTreeIfNotExist() {
    const context = await this.getContext();
    const res = await axiosInstance.get(`VccWebService/JSon/PGS_GetPublicCarparksStallCount`);
    const res2 = await axiosInstance.get(`VccWebService/JSon/PGS_GetStallsCurrentState`);
    const data = res.data;
    const data2 = res2.data;
    for (const carpark of data.Carparks){
      // On cherche si le device existe déjà
      const devices = await context.findInContext(
        context,
        (node) => node.info.name.get() === carpark.CarparkName
      );
      if (devices.length > 0){
        console.log("Device already exists", devices[0].info.id.get());
        //this.devices.push(devices[0]);
        continue;
      }
      // On crée le device et l'arborescance
      const device = new InputDataDevice(carpark.CarparkName,"device")
      //Create Total endpointgroup
      const totalEndpointGroup = new InputDataEndpointGroup("Total", "EndpointGroup");
      for (const endpointKey of Object.keys(carpark.CarparkSummary)){
        const endpoint = new InputDataEndpoint(endpointKey,
                        carpark.CarparkSummary[endpointKey] ,'', InputDataEndpointDataType.Integer,
                         InputDataEndpointType.Occupation);
        totalEndpointGroup.children.push(endpoint);
      }
      device.children.push(totalEndpointGroup);

      //Create Occupation endpointgroup

      const occupationEndpointGroup = new InputDataEndpointGroup("Occupations", "EndpointGroup");
      for(const carpark2 of data2.Carparks){
        if (carpark2.CarparkName == carpark.CarparkName){
          for (const level of carpark2.Levels){
            for(const stall of level.Stalls){
              const endpoint = new InputDataEndpoint("Occupation-"+stall.StallId,
                            stall.State=="Occupied" ,'', InputDataEndpointDataType.Boolean,
                             InputDataEndpointType.Occupation);
              occupationEndpointGroup.children.push(endpoint);
            }
          }
        }
      }
      device.children.push(occupationEndpointGroup);

      //Create an endpointGroup for each level
      for (const level of carpark.Levels){
        const endpointGroup = new InputDataEndpointGroup(level.LevelName, "EndpointGroup");
        for (const endpointKey of Object.keys(level.LevelCount)){
          const endpoint = new InputDataEndpoint(endpointKey,
                          level.LevelCount[endpointKey] ,'', InputDataEndpointDataType.Integer,
                           InputDataEndpointType.Occupation);
          endpointGroup.children.push(endpoint);
        }
        device.children.push(endpointGroup);
      }
      await this.nwService.updateData(device);
    }
  }

  async updateEndpointData() {
    const context = await this.getContext();
    const res = await axiosInstance.get(`VccWebService/JSon/PGS_GetPublicCarparksStallCount`);
    const res2 = await axiosInstance.get(`VccWebService/JSon/PGS_GetStallsCurrentState`);
    const data = res.data;
    const data2 = res2.data;

    for (const carpark of data.Carparks){
      carpark["Occupations"] = {};
      for(const carpark2 of data2.Carparks){
        if (carpark2.CarparkName == carpark.CarparkName){
          for (const level of carpark2.Levels){
            for(const stall of level.Stalls){
              const newName = `Occupation-${stall.StallId}`;
              carpark.Occupations[newName]= stall.State=="Occupied";
            }
          }
        }
      }
    }
    
    const networks = await this.nwService.getNetworks();
    const devices = await this.nwService.getDevices(networks[0])
    for (const device of devices){
      const deviceModel = this.nwService.getInfo(device);
      const carpark = data.Carparks.find((carpark) => carpark.CarparkName === deviceModel.name.get());
      const endpointGroups = deviceModel.childrenIds;
      for(const endpointGroup of endpointGroups){
        const endpointGroupModel = this.nwService.getInfo(endpointGroup);
        if(!endpointGroupModel || endpointGroupModel.type.get() !== "BmsEndpointGroup") continue;
        let newEndpointGroupData;
        if (endpointGroupModel.name.get() === "Total"){
          newEndpointGroupData = carpark.CarparkSummary;
        }
        else if (endpointGroupModel.name.get() === "Occupations"){
          newEndpointGroupData = carpark.Occupations;
        }
        else {
          newEndpointGroupData = carpark.Levels.find((level) => level.LevelName === endpointGroupModel.name.get());
          newEndpointGroupData = newEndpointGroupData.LevelCount;
        }
        
        for(const endpoint of endpointGroupModel.childrenIds){
          const endpointModel = this.nwService.getInfo(endpoint);
          if(!endpointModel || endpointModel.type.get() !== "BmsEndpoint") continue;
          const endpointValue = newEndpointGroupData[endpointModel.name.get()];
          await this.nwService.setEndpointValue(endpoint, endpointValue);
          console.log(deviceModel.name.get()," ",endpointGroupModel.name.get()," ",endpointModel.name.get(), " updated to ", endpointValue);
        }
      }
      
    }
    
    /*for (const endpoint of this.endpoints) {
      const node = await this.nwService.getData(endpoint);
      //const timeseries = await this.nwService.getTimeseries(endpoint);
      const time = new Date(); 
      const body = {version: 1,
                    type: "GENERIC_DECIMAL",
                    datas: [
                      {
                        ts: time,
                        message: node.currentValue.get()
                      }
                    ]};
      console.log(body)
      const streamId = this.mapping.get(node.name.get());
      try {
        await axiosInstance.post(
          `rest/v1/datas/devices/${this.sandBoxDeviceId}/streams/${streamId}/values`
          ,body);
      }
      catch (e) {
        console.log(e);
      }
    }*/
  }

  async init(): Promise<void> {
    await this.initContext();
    console.log("Context init Done...")
    await this.createTreeIfNotExist();
    await this.updateEndpointData();
  }

  async run(): Promise<void> {
    this.running = true;
    const timeout = this.config.client.pullInterval.get();
    await this.waitFct(timeout);
    while (true) {
      if (!this.running) break;
      const before = Date.now();
      try {

        console.log("Updating Data...");
        await this.updateEndpointData();
        console.log("... Data Updated !")
        this.config.client.lastSync.set(Date.now());
      } catch (e) {
        console.error(e);
        await this.waitFct(1000 * 60);
      } finally {
        const delta = Date.now() - before;
        const timeout = this.config.client.pullInterval.get() - delta;
        await this.waitFct(timeout);
      }
    }
  }

  stop(): void {
    this.running = false;
  }
}
export default SyncRunPull;
