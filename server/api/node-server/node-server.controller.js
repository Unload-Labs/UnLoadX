import { NodeServer, Test, User, LoadBalancer } from '../../db/db';
import { handleError } from '../../config/utils';
import request from 'request';
import Promise from 'bluebird';

const nodeController = {};


  nodeController.createServers = (servers, userId) => {

    servers.forEach(server => {
      NodeServer.findOne({where: {ip: server.ip}})
        .then(server => {
          if (!server) {
            NodeServer.create({
              ip: server.ip,
              port: server.port,
              application_type: server.application_type,
              userId: userId
            });
          } else {
            console.log('NodeServer already exists', server);
          }
        })
        .catch(err => console.error(err.message));
    });

  }

  /**
   * function createServerNodeSocket
   * Creates a new entry into the NodeServer table for each IP/Port entered
   * Creates an entry into Test table
   */
 nodeController.createServerNodeSocket = (post) => {

   const servers = post.servers;
   const authUserId = post.authUserId;
   let userId;

   // Retrieve UserId from User table
   return User.findOne({where: {authUserId: authUserId}})
     .then(user => {
       userId = user.dataValues.id;
       // Create records in NodeServer table for each server submitted
       createServers(servers, userId);
     })
     .then(() => {
       // Create record in Test Table
       return Test.create({
         volume: post.volume,
         userId: userId
       })
       .then(data => {
         // Create data structure to send to Load Balancer Service
         const dataForLB = {
           servers: servers,
           volume: data.dataValues.volume,
           testId: data.dataValues.id
         };
         console.log(`[STEP 1]: Finished Test.Create - Calling sendTestToLB and sending ${JSON.stringify(dataForLB)}`);

         // Send /POST request to Load Balancer
         return nodeController.sendTestToLB(dataForLB, userId);
       })
       .catch(err => console.error(err));
     });
 };

/**
 * function postToLB
 * Sends loadBalancer all servers in the database
 */

nodeController.sendTestToLB = (res, userId) => {
  console.log(`[STEP 2]: In sendTestToLB and sending ${JSON.stringify(res)}`);

  return new Promise((resolve, reject) => {
    request({
      url: 'http://52.8.16.173:9000/iptables',
      method: 'POST',
      body: JSON.stringify(res)
    }, (err, res, body) => {
      if (err) {
        console.log(`Error in sendTestToLB ${err.message}`);
        reject(err);
      } else {
        console.log(`[STEP 2.5]: Send Test to LB resolved successfully with ${res.statusCode} and received back body ${JSON.stringify(body)}`);

        let dataFromLB = JSON.parse(body);
        dataFromLB.userId = userId;

        console.log('[STEP 2.7]: Resolving back to server', dataFromLB);

        resolve(dataFromLB);
      }
    });
  });
};

// Starts siege by sending a /POST request to Siege Service
nodeController.startSiege = (data) => {

  return new Promise((resolve, reject) => {
    // Query Users to find Load Balancer IP for that User to pass to Siege Service
    User.findOne({where: {id: data.userId}, include: [LoadBalancer]})
      .then(user => {
        data.ip = user.LoadBalancer.ip;

        console.log(`[STEP 3]: Invoked startSiege promise - sending /POST to Siege Service with this data ${JSON.stringify(data)}`);

        // Sent /POST request to start Siege Service
        request({
          url: 'http://localhost:4000/siege',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }, (err, res, body) => {
          if (err) {
            console.log(`Error posting to /siege ${err.message}`);
            reject(err);
          } else {
            console.log('[STEP 3.5]: startSiege /POST to /siege was successful posting body', body);
            resolve(body);
          }
        });
      });
  });
};

/**
 * function getServers
 * Retrieves all servers in the database
 */

nodeController.getServers = (req, res) => {

  NodeServer.findAll()
    .then(servers => res.json(servers))
    .catch(handleError(res));

};

export default nodeController;
