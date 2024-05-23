apt-get update
apt-get install -y apt-utils
apt-get install -y wget 
apt-get install -y xz-utils
cd /app
wget https://nodejs.org/dist/v16.20.1/node-v16.20.1-linux-x64.tar.xz
tar -xJvf node-v16.20.1-linux-x64.tar.xz
ln -s /app/node-v16.20.1-linux-x64/bin/node /usr/bin/node
ln -s /app/node-v16.20.1-linux-x64/bin/npm /usr/bin/npm
ln -s /app/node-v16.20.1-linux-x64/bin/npx /usr/bin/npx
npm config set registry https://registry.npmmirror.com
npm install -g yarn
npm install -g npm@latest
npm install -g pnpm
/app/node-v16.20.1-linux-x64/lib/node_modules/yarn/bin/yarn config set registry https://registry.npmmirror.com
/app/node-v16.20.1-linux-x64/lib/node_modules/yarn/bin/yarn