#!/bin/sh

#copy wsn_setting files
if [ ! -d /home/adv/APIGateway/.git ] ; then
    cp -rf /home/adv/api_gw/* /home/adv/APIGateway/
    cp -rf /home/adv/api_gw/.git /home/adv/APIGateway/
    chmod -R a+rw /home/adv/APIGateway/
fi


cp -rf /home/adv/api_gw/apps/wsn_manage/wsn_setting/* /home/adv/wsn_setting/

#only remove subdirectoy
mkdir -p /home/adv/wsn_setting/device_html
cd /home/adv/wsn_setting/device_html
rm -Rf -- */

#remove all files
mkdir -p /home/adv/wsn_setting/device_table
cd /home/adv/wsn_setting/device_table
rm -rf *

#
cd /home/adv/APIGateway
node ./app.js

