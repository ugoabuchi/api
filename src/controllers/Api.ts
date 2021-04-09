import {
  JsonController,
  Body,
  Req,
  Res,
  Get,
  Post,
  QueryParam,
  Authorized,
  HttpCode,
  UploadedFile,
  CurrentUser,
  Param,
  OnUndefined,
  Delete,
} from "routing-controllers";

import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import AuthUtil from "../utils/Auth";
import Tenant from "../models/Tenant";
import Verification from "../models/Verification";
import Subscriptions from "../models/Subscriptions";
import GroupRequest from "../models/GroupRequest"
import SiteGroup from "../models/SiteGroup";
import FeedItem from "../models/FeedItem";
import {PublishStatus} from "../schemas/FeedItem";
import User from "../models/User";
import GraphUtil from "../utils/Graph";
import Firebase from "../utils/Firebase";
import * as mongoose from "mongoose";
import * as bcrypt from "bcrypt";


let response = {
  status: "",
  message: "",
  data: null,
  adata: [],
};

@JsonController("/api")
export default class ApiController {
  @Get("/version")
  version(@Res() response: any) {
    return response.json({
      version: 1.0,
    });
  }

  @Get("/register")
  @OnUndefined(201)
  async register(
    @QueryParam("tenant") tenantId: string,
    @QueryParam("state") state: string,
    @QueryParam("admin_consent") admin_consent: string
  ) {
    if (!tenantId || !state || !admin_consent) {
      throw new Error("Illegal operation");
    }
    try {
      let tenant = await Tenant.findOne({ objectId: tenantId });
      if (!tenant) {
        tenant = await GraphUtil.registerTenant(tenantId);
      }
      const accessToken = await tenant.getAccessToken();
      GraphUtil.init(accessToken.token);
      //await tenant.syncGroups()
    } catch (e) {
      console.log("Error", e);
      throw new Error("Illegal operation");
    }
  }

  //sign up
  @Get("/verify")
  async verify(
    @QueryParam("vcode") vcode: string,
    @QueryParam("uemail") uemail: string,
    @QueryParam("upassword") upassword: string
  ) {
    if (
      vcode !== undefined &&
      uemail !== undefined &&
      upassword !== undefined
    ) {
      let checkIfExist = await Verification.findOne({
        code: vcode,
        email: uemail,
      }).countDocuments();

      if (checkIfExist > 0) {
        let results = await Verification.findOne(
          { code: vcode, email: uemail },
          "siteGroupID expiresAt"
        );
        const expiresAt = new Date(results.toJSON().expiresAt);
        const userID = new Date(results.toJSON()._id);
        const currentDate = new Date();
        const isExpired = currentDate > expiresAt;
        if (isExpired === false) {
          let siteGroupID = results.toJSON().siteGroupID;
          let pwHash = await bcrypt.hash(upassword, 10);

          let checksiteGroupID = await SiteGroup.checkSiteGroup({
            _id: siteGroupID,
          });
          if (checksiteGroupID) {
            //activate account
            let user = await User.findOneAndUpdate(
              { email: uemail },
              { active: true, password: pwHash }
            );
            //let deletevcode = await Verification.findOneAndDelete({code: vcode, email: uemail});

            response["status"] = "success";
            response["message"] = "Successfully Verified";
            response["data"] = { email: uemail }; //json response of user email
            return response;
          } else {
            response["status"] = "error";
            response["message"] =
              "Invalid Site Group ID, contact administrator";
            response["data"] = {};
            return response;
          }
        } else {
          response["status"] = "error";
          response["message"] = "Code Expired, contact administrator";
          response["data"] = {};
          return response;
        }
      } else {
        response["status"] = "error";
        response["message"] = "Invalid credentials, contact administrator";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }

  //login api
  @Get("/login")
  async login(
    @QueryParam("uemail") uemail: string,
    @QueryParam("upassword") upassword: string
  ) {
    if (uemail !== undefined && upassword !== undefined) {
      let checkIfExist = await User.findOne({ email: uemail }).countDocuments();
      if (checkIfExist > 0) {
        let results = await User.findOne({ email: uemail }, "password");
        const dbpassword = results.toJSON().password;
        let Isvalid = await bcrypt.compare(upassword, dbpassword);
        if (Isvalid) {
          let user = await User.findOne({ email: uemail });
          if (user.toJSON().active === true) {
            response["status"] = "success";
            response["message"] = "Successfully Logged In";
            response["data"] = { email: uemail }; //json response of user email
            return response;
          } else {
            response["status"] = "error";
            response["message"] = "Account Inactive, contact administrator";
            response["data"] = {};
            return response;
          }
        } else {
          response["status"] = "error";
          response["message"] = "Invalid Password";
          response["data"] = {};
          return response;
        }
      } else {
        response["status"] = "error";
        response["message"] = "Invalid Email Address";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }


  @Get("/fetchfeeds")
  async fetchfeeds(@QueryParam("siteGroupID") siteGroupID: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number) {
    if (siteGroupID !== undefined && siteGroupID !== null && siteGroupID !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0) {
      let count = 0;
      //check if member exit and is active
      let checkIfExistandValid = await SiteGroup.findOne({
        _id: mongoose.Types.ObjectId(siteGroupID),
        isApproved: true,
      }).countDocuments();

      if (checkIfExistandValid > 0) {
        let data = [];
        let recieved = [];
        let feeds = await (await FeedItem.find({ siteGroup: mongoose.Types.ObjectId(siteGroupID), status: PublishStatus.PUBLISHED}).limit(limit).sort({createdDateTime: sort})).forEach( function f( doc ){ 
          
          data[count] = doc;
          count = count + 1;
          recieved[count] = doc._id.toString();
         
         })

        response["data"] = data;
        response['adata'] = recieved;
        response["status"] = "success";
        response["message"] = "FeedItems Available";
        return response;

      } else {
        response["status"] = "error";
        response["message"] = "Invalid Request";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }






  //Fetch Site Groups api
  @Get("/fetchUserSiteGroups")
  async fetchUserSiteGroups(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number) {
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0) {
      let count = 0;
      //check if member exit and is active
      let checkIfExistandValid = await User.findOne({
        email: uemail,
        active: true,
      }).countDocuments();

      if (checkIfExistandValid > 0) {
        let result = await User.findOne({ email: uemail }, "siteGroups");

        let recieved = result.toJSON().siteGroups; //array response of sitegroups
        let data = [];
        
        let sGroup = await (await SiteGroup.find({ _id: {"$in": recieved} , isApproved: true}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 

          
          data[count] = doc;
          count = count + 1;
          

         })

        response["data"] = data;
        response['adata'] = recieved;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response;

      } else {
        response["status"] = "error";
        response["message"] = "Invalid Request";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }


  @Get("/getByTypeUserSiteGroups")
  async getByTypeUserSiteGroups(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number, @QueryParam("type") type: string) {
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0 || type !== undefined && type !== null && type !== "") {
      let count = 0;
      //check if member exit and is active
      let checkIfExistandValid = await User.findOne({
        email: uemail,
        active: true,
      }).countDocuments();

      if (checkIfExistandValid > 0) {
        let result = await User.findOne({ email: uemail }, "siteGroups");

        let recieved = result.toJSON().siteGroups; //array response of sitegroups
        let data = [];
        let uType = type == "Private" ? "private" : "public";
        let sGroup = await (await SiteGroup.find({ _id: {"$in": recieved} , isApproved: true, visibility: uType}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 

          
          data[count] = doc;
          count = count + 1;
          

         })

        response["data"] = data;
        response['adata'] = recieved;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response;

      } else {
        response["status"] = "error";
        response["message"] = "Invalid Request";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }



  //Fetch Site Group api
  @Get("/fetchUserSiteGroup")
  async fetchUserSiteGroup(@QueryParam("_id") _id: string) {
    if (_id !== undefined && _id !== null && _id !== "") {
      let sGroup = await (
        await SiteGroup.getPopulatedRow({ _id: _id })
      ).toJSON();
      if (sGroup != null) {
        //check if group is approved
        if (sGroup.isApproved === true) {
          response["status"] = "success";
          response["message"] = "Group details received";
          response["data"] = sGroup;
          return response;
        } else {
          response["status"] = "error";
          response["message"] = "Group not yet approved, contact administrator";
          response["data"] = {};
          return response;
        }
      } else {
        response["status"] = "error";
        response["message"] = "Undefined";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }

 

  //Fetch Site Group Requests api
  @Get("/getGroupRequest")
  //add jwt token to all request
  async getGroupRequest(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number) {
    let data = [];
    let recieved = [];
    let count = 0;
    let rCount = 0;
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0) {
      
        //get group request
        let groups = await (await GroupRequest.find({email: uemail})).forEach( function f( doc ){ 

          recieved[count] = doc['siteGroupID'].toString();
          count = count + 1;

         })
         let sGroup = await (await SiteGroup.find({ _id: {"$in": recieved} , isApproved: true}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 

          
          data[rCount] = doc;
          rCount = rCount + 1;
          

         })
        response["data"] = data;
        response['adata'] = recieved;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response
      
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }

  @Get("/getGroupRequestByType")
  //add jwt token to all request
  async getGroupRequestByType(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number, @QueryParam("type") type: string) {
    let data = [];
    let recieved = [];
    let count = 0;
    let rCount = 0;
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0 || type !== undefined && type !== null && type !== "") {
      
        //get group request
        let groups = await (await GroupRequest.find({email: uemail})).forEach( function f( doc ){ 

          recieved[count] = doc['siteGroupID'].toString();
          count = count + 1;

         })
        let uType = type == "Private" ? "private" : "public";
        let sGroup = await (await SiteGroup.find({ _id: {"$in": recieved} , isApproved: true, visibility: uType}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 

          
          data[rCount] = doc;
          rCount = rCount + 1;
          

         })
        response["data"] = data;
        response['adata'] = recieved;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response
      
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }

 

  //Fetch Site Group Requests api
  @Get("/searchGroupRequest")
  //add jwt token to all request
  async searchGroupRequest(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number,  @QueryParam("searchText") searchText: String) {
    let data = [];
    let recieved = [];
    let count = 0;
    let rCount = 0;
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0 || searchText !== undefined && searchText !== null && searchText !== "") {
      
        //get group request
        let groups = await (await GroupRequest.find({email: uemail})).forEach( function f( doc ){ 

          recieved[count] = doc['siteGroupID'].toString();
          count = count + 1;

         })
         let sGroup = await (await SiteGroup.find({ _id: {"$in": recieved} , isApproved: true,"displayName": new RegExp("\/"+searchText+"\/").compile()}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 

          
          data[rCount] = doc;
          rCount = rCount + 1;
          

         })
        response["data"] = data;
        response['adata'] = recieved;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response
      
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }


    //add subscription api
    @Post("/acceptGRequest")
    //add jwt token to all request
    async acceptGRequest(@QueryParam("uemail") uemail: string, @QueryParam("sitegroupid") sitegroupid: string) {
      if (uemail !== undefined && uemail !== null && uemail !== "" || sitegroupid !== undefined && sitegroupid !== null && sitegroupid !== "") {
       
       let checkIfRequestIsAvailable = await GroupRequest.findOne({
         email: uemail,
         siteGroupID: sitegroupid
       }).countDocuments();
 
       if(checkIfRequestIsAvailable > 0)
       {
         //Update User SiteGroups document
         await User.update({email: uemail}, { $push: { siteGroups: mongoose.Types.ObjectId(sitegroupid) }});
         //delete group request document
         await GroupRequest.findOneAndDelete({
          email: uemail,
          siteGroupID: sitegroupid
          }, function (err){
            if(err)
            console.log(err)
            else
            console.log("success");
          });
  
       response["status"] = "success";
       response["message"] = "Group request successfully accepted";
       response["data"] = {};
       return response;
       }
       else
       {
       response["status"] = "error";
       response["message"] = "Request not available";
       response["data"] = {};
       return response;
       }
        
      } else {
       response["status"] = "error";
       response["message"] = "Undefined";
       response["data"] = {};
       return response;
      }
    }
    
    //delete group request document
    @Delete("/declineGRequest")
    //add jwt token to all request
    async declineGRequest(@QueryParam("uemail") uemail: string, @QueryParam("sitegroupid") sitegroupid: string) {
      if (uemail !== undefined && uemail !== null && uemail !== "" || sitegroupid !== undefined && sitegroupid !== null && sitegroupid !== "") {
       
       let checkIfRequestAlreadySent = await GroupRequest.findOne({
         email: uemail,
         siteGroupID: sitegroupid
       }).countDocuments();
 
       if(checkIfRequestAlreadySent > 0)
       {
         //delete GroupRequest document
         GroupRequest.findOneAndDelete({
         email: uemail,
         siteGroupID: sitegroupid
         }, function (err){
           if(err)
           console.log(err)
           else
           console.log("success");
         });
 
       response["status"] = "success";
       response["message"] = "Subscription request canceled";
       response["data"] = {};
       return response;
       }
       else
       {
       response["status"] = "error";
       response["message"] = "Request not available";
       response["data"] = {};
       return response;
       }
        
      } else {
       response["status"] = "error";
       response["message"] = "Undefined";
       response["data"] = {};
       return response;
      }
    }

  //Fetch Site Groups api
  @Get("/getSiteGroups")
  async getSiteGroups(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number) {
    let data = [];
    let maindata = [];
    let ndata = [];
    let count = 0;
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0) {
      //check if member exit and is active
      let checkIfExistandValid = await User.findOne({
        email: uemail,
        active: true,
      }).countDocuments();

      if (checkIfExistandValid > 0) {
        let result = await User.findOne({ email: uemail }, "siteGroups");

        let recieved = result.toJSON().siteGroups; //array response of sitegroups
        let sGroup = await (await SiteGroup.find({ _id: {"$nin": recieved} , isApproved: true}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 

          
          data[count] = doc;
          count = count + 1;
          

         })

         for(let i = 0; i < data.length; i++)
         {

          let checkIfRequestAlreadySent = await Subscriptions.findOne({
            email: uemail,
            siteGroupID: data[i]._id
          }).countDocuments();

          if(checkIfRequestAlreadySent < 1)
          {
            ndata[i] = [data[i], "not pending"];
            maindata[i] = data[i]._id.toString();
          }
          else
          {
            ndata[i] = [data[i], "pending"];
            maindata[i] = data[i]._id.toString();
          }
          

         }

        response["data"] = ndata;
        response['adata'] = maindata;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response;

      } else {
        response["status"] = "error";
        response["message"] = "Invalid Request";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }

    //Fetch Site Groups api
    @Get("/getSiteGroupsByType")
    async getSiteGroupsByType(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number, @QueryParam("type") type: string) {
      let data = [];
      let maindata = [];
      let ndata = [];
      let count = 0;
      
        if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0 || type !== undefined && type !== null && type !== "") {
           //check if member exit and is active
        let checkIfExistandValid = await User.findOne({
          email: uemail,
          active: true,
        }).countDocuments();
  
        if (checkIfExistandValid > 0) {
          let result = await User.findOne({ email: uemail }, "siteGroups");
  
          let recieved = result.toJSON().siteGroups; //array response of sitegroups
          let uType = type == "Private" ? "private" : "public";
          let sGroup = await (await SiteGroup.find({ _id: {"$nin": recieved} , isApproved: true, visibility: uType}).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 
  
            
            data[count] = doc;
            count = count + 1;
            
  
           })
  
           for(let i = 0; i < data.length; i++)
           {
  
            let checkIfRequestAlreadySent = await Subscriptions.findOne({
              email: uemail,
              siteGroupID: data[i]._id
            }).countDocuments();
  
            if(checkIfRequestAlreadySent < 1)
            {
              ndata[i] = [data[i], "not pending"];
              maindata[i] = data[i]._id.toString();
            }
            else
            {
              ndata[i] = [data[i], "pending"];
              maindata[i] = data[i]._id.toString();
            }
            
  
           }
  
          response["data"] = ndata;
          response['adata'] = maindata;
          response["status"] = "success";
          response["message"] = "Sitegroup Available";
          return response;
  
        } else {
          response["status"] = "error";
          response["message"] = "Invalid Request";
          response["data"] = {};
          return response;
        }
      } else {
        response["status"] = "error";
        response["message"] = "Undefined";
        response["data"] = {};
        return response;
      }
    }

 


  //Fetch Site Groups api
  @Get("/getPendingSiteGroups")
  async getPendingSiteGroups(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number) {
    let data = [];
    let maindata = [];
    let ndata = [];
    let count = 0;
    let num = 0;
    if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0) {
      //check if member exit and is active
      let checkIfExistandValid = await User.findOne({
        email: uemail,
        active: true,
      }).countDocuments();

      if (checkIfExistandValid > 0) {
        let result = await User.findOne({ email: uemail }, "siteGroups");

        let recieved = result.toJSON().siteGroups; //array response of sitegroups
        let sGroup = await (await SiteGroup.find({ _id: {"$nin": recieved} , isApproved: true}).limit(limit)).forEach( function f( doc ){ 

          
          data[count] = doc;
          count = count + 1;
          

         })

         for(let i = 0; i < data.length; i++)
         {

          let checkIfRequestAlreadySent = await Subscriptions.findOne({
            email: uemail,
            siteGroupID: data[i]._id
          }).countDocuments();

          
          if(checkIfRequestAlreadySent > 0)
          {
            ndata[num] = [data[i], "pending"];
            maindata[num] = data[i]._id.toString();
            num = num + 1;
          }
          else{
            continue;
          }
          

         }

        response["data"] = ndata;
        response['adata'] = maindata;
        response["status"] = "success";
        response["message"] = "Sitegroup Available";
        return response;

      } else {
        response["status"] = "error";
        response["message"] = "Invalid Request";
        response["data"] = {};
        return response;
      }
    } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
    }
  }


    //Fetch Site Groups api
    @Get("/searchSiteGroups")
    async searchSiteGroups(@QueryParam("uemail") uemail: string, @QueryParam("limit") limit: number,  @QueryParam("sort") sort: number, @QueryParam("searchText") searchText: String) {
      let data = [];
      let maindata = [];
      let ndata = [];
      let count = 0;

      if (uemail !== undefined && uemail !== null && uemail !== "" || limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0 || searchText !== undefined && searchText !== null && searchText !== "") {
        //check if member exit and is active
        let checkIfExistandValid = await User.findOne({
          email: uemail,
          active: true,
        }).countDocuments();
  
        if (checkIfExistandValid > 0) {
          
          let result = await User.findOne({ email: uemail }, "siteGroups");
          let recieved = result.toJSON().siteGroups; //array response of sitegroups
          let sGroup = await (await SiteGroup.find({ _id: {"$nin": recieved}, isApproved: true ,"displayName": new RegExp("\/"+searchText+"\/").compile() }).limit(limit).sort({displayName: sort})).forEach( function f( doc ){ 
  
            
            data[count] = doc;
            count = count + 1;
            
  
           })
  
           for(let i = 0; i < data.length; i++)
           {
  
            let checkIfRequestAlreadySent = await Subscriptions.findOne({
              email: uemail,
              siteGroupID: data[i]._id
            }).countDocuments();
  
            if(checkIfRequestAlreadySent < 1)
            {
              ndata[i] = [data[i], "not pending"];
              maindata[i] = data[i]._id.toString();
            }
            else
            {
              ndata[i] = [data[i], "pending"];
              maindata[i] = data[i]._id.toString();
            }
            
  
           }
  
          response["data"] = ndata;
          response['adata'] = maindata;
          response["status"] = "success";
          response["message"] = "Sitegroup Available";
          return response;
  
        } else {
          response["status"] = "error";
          response["message"] = "Invalid Request";
          response["data"] = {};
          return response;
        }
      } else {
        response["status"] = "error";
        response["message"] = "Undefined";
        response["data"] = {};
        return response;
      }
    }


   //add subscription api
   @Post("/subscribe")
   //add jwt token to all request
   async subscribe(@QueryParam("uemail") uemail: string, @QueryParam("sitegroupid") sitegroupid: string) {
     if (uemail !== undefined && uemail !== null && uemail !== "" || sitegroupid !== undefined && sitegroupid !== null && sitegroupid !== "") {
      
      let checkIfRequestAlreadySent = await Subscriptions.findOne({
        email: uemail,
        siteGroupID: sitegroupid
      }).countDocuments();

      if(checkIfRequestAlreadySent < 1)
      {
        //insert subscription document
        let savesubscription = new Subscriptions({
        email: uemail,
        siteGroupID: sitegroupid
        });
        await savesubscription.save();
      response["status"] = "success";
      response["message"] = "Subscription request sent";
      response["data"] = {};
      return response;
      }
      else
      {
      response["status"] = "error";
      response["message"] = "Request already available";
      response["data"] = {};
      return response;
      }
       
     } else {
      response["status"] = "error";
      response["message"] = "Undefined";
      response["data"] = {};
      return response;
     }
   }


    //delete subscription api
    @Delete("/cancelsubscribe")
    //add jwt token to all request
    async cancelsubscribe(@QueryParam("uemail") uemail: string, @QueryParam("sitegroupid") sitegroupid: string) {
      if (uemail !== undefined && uemail !== null && uemail !== "" || sitegroupid !== undefined && sitegroupid !== null && sitegroupid !== "") {
       
       let checkIfRequestAlreadySent = await Subscriptions.findOne({
         email: uemail,
         siteGroupID: sitegroupid
       }).countDocuments();
 
       if(checkIfRequestAlreadySent > 0)
       {
         //delete subscription document
         Subscriptions.findOneAndDelete({
         email: uemail,
         siteGroupID: sitegroupid
         }, function (err){
           if(err)
           console.log(err)
           else
           console.log("success");
         });
 
       response["status"] = "success";
       response["message"] = "Subscription request canceled";
       response["data"] = {};
       return response;
       }
       else
       {
       response["status"] = "error";
       response["message"] = "Request not available";
       response["data"] = {};
       return response;
       }
        
      } else {
       response["status"] = "error";
       response["message"] = "Undefined";
       response["data"] = {};
       return response;
      }
    }

   //filter api for the group section
   @Get("/sortGroupByName")
   async sortGroupByName(@QueryParam("limit") limit: number, @QueryParam("sort") sort: number) {
     if (limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0) {
       let sGroup =  await SiteGroup.find({isApproved: true}, "displayName").sort({displayName: sort}).limit(limit);
       return sGroup;
       
     } else {
       return null;
     }
   }

   @Get("/sortGroupByDate")
   async sortGroupByDate(@QueryParam("limit") limit: number, @QueryParam("sort") sort: number) {
     if (limit !== undefined && limit !== null && limit !== 0 || sort !== undefined && sort !== null && sort !== 0) {
       let sGroup =  await SiteGroup.find({isApproved: true}).sort({createdAt: sort}).limit(limit);
       return sGroup;
       
     } else {
       return null;
     }
   }



   //
 

  @Post("/pushTest")
  @OnUndefined(200)
  async sendTestMessage(@Body() message: any) {
    //alert
    await Firebase.pushToTopic("content", message);
  }
}
