pc.script.create('minimap', function (context) {
    var Minimap = function (entity) {
        this.entity = entity;
        
        this.sizeInc = 48;
        this.size = 4;
        
        this.canvas = this.prepareCanvas();
        this.canvas.width = this.sizeInc * this.size;
        this.canvas.height = this.sizeInc * this.size;
        document.body.appendChild(this.canvas);
        document.body.style.overflow = 'hidden';
        
        this.ctx = this.canvas.getContext('2d');
        
        this.circles = [ ];
        this.lastCircle = Date.now();
        this.circleLife = 1000;
    };

    Minimap.prototype = {
        prepareCanvas: function() {
            var canvas = document.createElement('canvas');
            canvas.className = 'minimap';
            canvas.style.display = 'block';
            canvas.style.position = 'absolute';
            canvas.style.top = (10 * this.size + 16) + 'px';
            canvas.style.right = (10 * this.size + 16) + 'px';
            canvas.style.zIndex = 1;
            canvas.style.backgroundColor = 'rgba(0, 0, 0, .7)';
            canvas.style.border = '4px solid #212224';
            canvas.style.webkitTransform = 'rotate(45deg)';
            canvas.style.mozTransform = 'rotate(45deg)';
            canvas.style.msTransform = 'rotate(45deg)';
            canvas.style.transform = 'rotate(45deg)';
            
            return canvas;
        },
        
        initialize: function () {
            this.bullets = context.root.findByName('bullets');
            this.tanks = context.root.findByName('tanks');
            this.client = context.root.getChildren()[0].script.client;
            
            this.resize(true);
        },
        
        resize: function(force) {
            var size = Math.max(2, Math.min(4, Math.floor(window.innerWidth / 240)));
            if (size !== this.size || force) {
                this.size = size;
                this.canvas.width = this.sizeInc * this.size;
                this.canvas.height = this.sizeInc * this.size;
                
                this.canvas.style.top = (10 * this.size + 16) + 'px';
                this.canvas.style.right = (10 * this.size + 16) + 'px';
                
                var info = document.getElementById('infoButton');
                if (info) {
                    info.script.setSize(34 * this.size - 22);
                }
                var fs = document.getElementById('fullscreenButton');
                if (fs) {
                    fs.script.setSize(34 * this.size - 22);
                }
            }
        },
        
        draw: function() {
            this.resize();

            var ctx = this.ctx;
            var clr, i, pos;
            
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // grid
            var gridSize = this.canvas.width / 16;
            ctx.beginPath();
            for(var x = 1; x < 16; x++) {
                ctx.moveTo(Math.floor(gridSize * x) + 0.5, 0);
                ctx.lineTo(Math.floor(gridSize * x) + 0.5, this.canvas.height);
            }
            for(var y = 1; y < 16; y++) {
                ctx.moveTo(0, Math.floor(gridSize * y) + 0.5);
                ctx.lineTo(this.canvas.width, Math.floor(gridSize * y) + 0.5);
            }
            ctx.strokeStyle = '#212224';
            ctx.stroke();
            
            // bullets
            ctx.beginPath();
            var bullets = this.bullets.getChildren();
            i = bullets.length;
            while(i--) {
                pos = bullets[i].getPosition();
                pos.x = pos.x / 64 * this.canvas.width + (this.canvas.width / 2);
                pos.z = pos.z / 64 * this.canvas.height + (this.canvas.height / 2);

                if (bullets[i].lastX !== undefined) {
                    ctx.moveTo(bullets[i].lastX, bullets[i].lastZ);
                    ctx.lineTo(pos.x, pos.z);
                }
                
                bullets[i].lastX = pos.x;
                bullets[i].lastZ = pos.z;
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, .8)';
            ctx.stroke();
            
            // radar circles
            i = this.circles.length;
            while(i--) {
                if (Date.now() - this.circles[i].time > this.circleLife) {
                    this.circles.splice(i, 1);
                } else {
                    size = ((this.circleLife - (Date.now() - this.circles[i].time)) / this.circleLife);
                    ctx.beginPath();
                    ctx.arc(this.circles[i].x, this.circles[i].z, Math.max(1, (1.0 - size) * 8 * this.size), 0, Math.PI * 2, false);
                    ctx.fillStyle = 'rgba(33, 34, 36, ' + Math.min(1.0, size * 2) + ')';
                    ctx.fill();
                }
            }
            
            // tanks
            var tanks = this.tanks.getChildren();
            i = tanks.length;
            while(i--) {
                pos = tanks[i].getPosition();
                pos.x = pos.x / 64 * this.canvas.width + (this.canvas.width / 2);
                pos.z = pos.z / 64 * this.canvas.width + (this.canvas.width / 2);
                
                if (tanks[i].getName() == 'tank_' + this.client.id && Date.now() - this.lastCircle > 1300) {
                    this.lastCircle = Date.now();
                    this.circles.push({
                        time: Date.now(),
                        x: pos.x,
                        z: pos.z
                    });
                }
                
                ctx.save();
                ctx.beginPath();
                ctx.translate(pos.x, pos.z);
                ctx.rotate(-Math.atan2(tanks[i].forward.x, tanks[i].forward.z));
                ctx.rect(-1.25, -2.5, 2.5, 5);
                clr = tanks[i].script.tank.matBase.emissive;
                ctx.fillStyle = '#' + ('00' + Math.floor(clr.r * 255).toString(16)).slice(-2) + ('00' + Math.floor(clr.g * 255).toString(16)).slice(-2) + ('00' + Math.floor(clr.b * 255).toString(16)).slice(-2);
                ctx.fill();
                ctx.restore();
            }
        }
    };

    return Minimap;
});