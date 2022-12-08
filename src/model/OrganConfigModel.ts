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

import { spinalCore, Model } from 'spinal-core-connectorjs_type';

export interface ClientConfigObj extends spinal.Model {
  apiLogin: spinal.Str;
  apiPassword: spinal.Str;
  apiKey: spinal.Str;
  pullInterval: spinal.Val;
  lastSync: spinal.Val;
}

export default class OrganConfigModel extends Model {
  digitalTwinPath: spinal.Str;
  contextId: spinal.Str;
  spatialContextID: spinal.Str;
  client: ClientConfigObj;
  restart: spinal.Bool;

  constructor() {
    super();
    this.add_attr('digitalTwinPath', '/__users__/admin/Digital twin VF');
    this.add_attr('contextId', '');
    this.add_attr('spatialContextID', '');
    this.add_attr('restart', false);
    this.add_attr('client', {
      apiLogin: '',
      apiPassword: '',
      apiKey:'',
      pullInterval: 5 * 60 * 1000,
      lastSync: 0,
      organStatus: 0
    });
  }

  updateSync() {
    this.client.lastSync.set(Date.now());
  }
  initEnv() {
    if (process?.env.DIGITALTWIN_PATH)
      this.digitalTwinPath.set(process.env.DIGITALTWIN_PATH);
    if (process?.env.CONTEXT_ID) this.contextId.set(process.env.CONTEXT_ID);
    if (process?.env.SPATIAL_CONTEXT_ID)
      this.spatialContextID.set(process.env.SPATIAL_CONTEXT_ID);
    if (process?.env.API_LOGIN)
      this.client.apiLogin.set(process.env.API_LOGIN);
    if (process?.env.API_PASSWORD)
      this.client.apiPassword.set(process.env.API_PASSWORD);
    if (process?.env.API_KEY)
      this.client.apiKey.set(process.env.API_KEY);
    if (process?.env.PULL_INTERVAL)
      this.client.pullInterval.set(process.env.PULL_INTERVAL);
  }
  bindRestart() {
    this.restart.bind(() => {
      if (this.restart.get() === true) {
        console.log('Restart organ');

        process.exit(0);
      }
    });
  }
}

spinalCore.register_models(OrganConfigModel);
