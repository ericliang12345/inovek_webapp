# APIGateway
Advantech iGateway RESTful API Gateway

Install to system, default path is /usr/local/EdgeSense/API-GW
>sudo make install

or assign destination dir to be installed
>make install DESTDIR=/home/adv/rootfs

enable service
>sudo systemctl enable API-GW.service

start service
>sudo systemctl start API-GW.service

stop service
>sudo systemctl stop API-GW.service

check service status
>sudo systemctl status API-GW.service
