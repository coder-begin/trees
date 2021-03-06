/*
combined files : 

kg/trees/2.0.0/store
kg/trees/2.0.0/viewstore

*/
/** 
* Store 树专用数据缓冲对象
* @version 2.0
*/
KISSY.add('kg/trees/2.0.0/store',function(S){

	/**
	* Store 树专用数据缓冲对象 树的遍历、树的数据管理
	* @class Trees.Store
	* @module Trees
	* @author 桐人<wwwfuzheng@qq.com>
	* @extend KISSY.Base
	* @constructor Store
	* @param {Object} config 配置项
	*/
	function Store(config){
		var _self = this;
		config = S.merge(Store.config, config);
		Store.superclass.constructor.call(_self, config);
		//支持的事件
		_self.events = [
			/**  
			* 数据加载完成时 触发此事件（load/setTreeData 都会触发)
			* @event load
			* @param {event} e  事件对象
			* @param {Array} e.data 加载的数据
			* @param {String} e.id 所在节点的id
			* @param {Object} e.param 加载的参数（setTreeData触发时没有此属性）
			*/
			'load',
			/**  
			* 通过text遍历搜索树后 触发此事件
			* @event searchTree
			* @param {event} e  事件对象
			* @param {String} e.text 搜索的文本值
			* @param {Array} e.pathList 搜索的路径id集合
			* @param {Array} e.valuePathList 搜索的路径value集合
			* @param {Object} e.result 搜索结果
			*/
			'searchTree'
		];
		_self._init();
	}
	Store.config = {
		/**
		* 数据异步读取url（选填，不填的话可以手动设置树的数据）
		* @property url
		* @type String
		*/
		url: null,
		/**
		* 异步请求方式('get'/'post')，在jsonp方式下，不起作用，固定为get
		* @property requestType
		* @type String
		* @default  'get'
		*/
		requestType: 'get',
		/**
		* 节点数据中，id的key（选填, 不填的话默认是 adapterForNode.id）
		* @property idKey
		* @type String
		*/
		idKey: null,
		/**
		* 数据读取的初始化参数，与 url 配合适用（选填）
		* @property param
		* @type Object
		* @default  {}
		*/
		param: {},
		/**
		* 给store初始化用的数据
		* @property data
		* @type Array
		* @default  []
		*/
		data: [],
		/**
		* 是否用jsonp形式发送请求
		* @property isJsonp
		* @type Boolean
		* @default  false
		*/
		isJsonp: false,
		/**
		* 数据是否自动加载（选填）
		* @property autoLoad
		* @type Boolean
		* @default  true
		*/
		autoLoad: true,
		/**
		* node数据的适配器（选填）
		* @property adapterForNode
		* @type Object
		* @default  
		*	{
		*		id: 'id',
		*		value: 'value',
		*		children: 'children',
		*		parent: 'parent',
		*		isleaf: 'isleaf'
		*	}
		*/
		adapterForNode: {
			id: 'id',
			value: 'value',
			children: 'children',
			parent: 'parent',
			isleaf: 'isleaf'
		},
		/**
		* 数据的适配器（选填）
		* @property adapterForData
		* @type Object
		* @default  
		*	{
		*		success: 'success',
		*		nodes: 'nodes',
		*		message: 'message'
		*	}
		*/
		adapterForData: {
			success: 'success',
			nodes: 'nodes',
			message: 'message'
		},
		/**
		* 当数据加载失败的回调方法（选填）
		* @property dataErrorFunc
		* @type Function
		* @default  alert(msg);
		*/
		dataErrorFunc: function(msg){
			//S.error(msg);
		}
	};
	S.extend(Store, S.Base);

	S.augment(Store, {
		/**
		* 检查树的数据是否加载完成
		* @method isTreeReady
		* @param {Object} [node] 要检查的节点对象 （选填，不填则检查整个树对象）
		* @param {Function} [func] 若没有完成时，加载数据是需要回调的方法 （选填）
		* @return {Boolean} 是否准备完成
		*/
		isTreeReady: function(node, func){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				nodeData,
				isReady = true;
			
			if(node){
				if(node[adapterForNode.isleaf]){
					return true;
				}else{
					nodeData = node[adapterForNode.children];
				}
			}else{
				nodeData = _self.getTreeData();
			}

			if(nodeData.length === 0){
				isReady = false;
			}
			// 若没有准备好，则加载数据
			if(!isReady){
				var id = node ? node[adapterForNode.id] : null;
				_self.load(id, null, func);
			}

			return isReady;
		},
		/**
		* 加载树数据 此方法会触发load事件
		* @method load
		* @param {Object|String} [param] 参数对象 或 需要加载的id (不填则取默认的参数对象，若是String，则会用idKey配置参数对象)
		* @param {String} [url] 加载数据的url （选填，没有则取默认的url）
		* @param {Function} [func] 加载完成时需要回调的方法 （选填）
		* @param {Boolean} [isTreeData] 是否加载整树数据 （选填，默认为false）
		*/
		load: function(param, url, func, isTreeData){
			var _self = this,
				adapterForData = _self.get('adapterForData'),
				idKey = _self.get('idKey'),
				isTreeData = isTreeData || false,
				loadParam = _self._getParam(param),
				ajaxConfig = {
					type: _self.get('requestType'),
					dataType: 'json'
				};

			url = url || _self.get('url');
			// 若调用load 则 url 必填
			if(!url){
				throw 'please assign the URL of Data for Tree!';
			}
			// 是否用jsonp方式请求
			if(_self.get('isJsonp')){
				ajaxConfig = S.merge(ajaxConfig, {
					type: 'get',
					dataType: 'jsonp',
					cache: false,
					crossDomain: true
				});
			}

			S.io(S.merge(ajaxConfig, {
				url: url,
				data: loadParam,
				success: function(data){
					if(data && data[adapterForData.success] === true  && data[adapterForData.nodes].length > 0){
						_self.fire('load', {
							data: data[adapterForData.nodes],
							id: isTreeData ? null : loadParam[idKey] || null, 
							param: loadParam
						});
						if(func){
							func();
						}
					}else{
						_self._dataError(data ? data[adapterForData.message] : '');
					}
				},
				error: function(){
					_self._dataError('请求异常！');
				}				
			
			}));
		},
		/**
		* 初始化加载store
		* @method initLoad
		*/
		initLoad: function(){
			var _self = this;
			if(_self.get('url')){
				_self.load();
			}else{
				_self.setTreeData(_self.get('data'));
			}
		},
		/**
		* 遍历树，通过id搜索节点
		* @method traverseTreeById
		* @param {String|Number} id 目标id。 若没有，则返回的皆为空值
		* @return {Object} 返回值： 
				obj.path => 该节点的路径id
				obj.valuePath => 该节点的路经value
				obj.pathNode => 该节点的路经node
				obj.node => 该节点对象
		*/
		traverseTreeById: function(id){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				treeData = _self.getTreeData(),
				path = [],
				valuePath = [],
				pathNode = [],
				_traverse;

			_traverse = function(nodeData, deep){
				deep = deep || 0;
				if(nodeData){
					for(var i = 0; i < nodeData.length; i++){
						var node = nodeData[i];
						if(node[adapterForNode.id] === id || (!node[adapterForNode.isleaf] && _traverse(node[adapterForNode.children], deep + 1))){
							path[deep] = node[adapterForNode.id];
							valuePath[deep] = node[adapterForNode.value];
							pathNode[deep] = node;
							return true;
						}
					}
				}
				return false;			
			};

			if(id){
				_traverse(treeData);
			}

			return {
				path: path,
				valuePath: valuePath,
				pathNode: pathNode,
				node: pathNode[pathNode.length - 1] || null
			};
		},
		/**
		* 遍历树，通过text搜索节点列表
		* @method traverseTreeByText
		* @param {String} text 目标文本。 若没有，则返回的皆为空值
		* @return {Object} 返回值： 
				obj.pathList => 路径id列表
				obj.valuePathList => 路径value列表
				obj.pathNodeList => 路径node列表，节点数据不带children属性
		*/
		traverseTreeByText: function(text){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				treeData = _self.getTreeData(),
				path = [],
				pathNode = [],
				valuePath = [],
				pathList = [],
				pathNodeList = [],
				valuePathList = [],
				_traverse;

			_traverse = function(nodeData, deep){
				deep = deep || 0;
				if(nodeData){
					for(var i = 0; i < nodeData.length; i++){
						var l = path.length - deep - 1,
							node = nodeData[i];
						for(var j = 0; j < l; j++){
							path.pop();
							valuePath.pop();
							pathNode.pop();
						}
						path[deep] = node[adapterForNode.id];
						valuePath[deep] = node[adapterForNode.value];
						pathNode[deep] = node;
						if(node[adapterForNode.value].indexOf(text) > -1){
							pathList.push(S.clone(path));
							valuePathList.push(S.clone(valuePath));
							pathNodeList.push(_self.dataFilter(pathNode));
						}
						if(!node[adapterForNode.isleaf]){
							_traverse(node[adapterForNode.children], deep + 1);
						}
					}
				}
			};

			if(text){
				_traverse(treeData);
			}

			return {
				pathList: pathList,
				pathNodeList: pathNodeList,
				valuePathList: valuePathList
			};
		},
		/**
		* 通过id 获取节点对象
		* @method getNodeById
		* @param {String|Number} id 目标id。 若没有，则返回空值
		* @return {Object} 节点对象
		*/
		getNodeById: function(id){
			var _self = this;
			return _self.traverseTreeById(id).node;
		},
		/**
		* 通过Path 获取节点对象
		* @method getNodeByPath
		* @param {Array} path 目标path。 若没有，则返回空值
		* @return {Object} 节点对象
		*/
		getNodeByPath: function(path){
			path = path || [];
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				treeData = _self.getTreeData(),
				node = null,
				nodeChildren = treeData;
			S.each(path, function(id){
				S.each(nodeChildren, function(n){
					if(n[adapterForNode.id] === id){
						node = n;
						return false;
					}
				});
				nodeChildren = node[adapterForNode.children];
			});

			return node;
		},
		/**
		* 通过id 获取节点路径
		* @method getPathById
		* @param {String|Number} id 目标id。 若没有，则返回[]
		* @return {Array} 节点路径
		*/
		getPathById: function(id){
			var _self = this;
			return _self.traverseTreeById(id).path;
		},
		/**
		* 通过id 获取该节点的父节点对象
		* @method getParentById
		* @param {String|Number} id 目标id。 （必填）
		* @return {Object} 父节点对象
		*/
		getParentById: function(id){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				node = _self.getNodeById(id),
				parentId = node[adapterForNode.parent];
			return _self.getNodeById(parent);
		},
		/**
		* 通过id 获取子节点列表
		* @method getChildrenById
		* @param {String|Number} id 目标id。 若没有，则返回[]
		* @return {Array} 子节点列表
		*/
		getChildrenById: function(id){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				node = _self.getNodeById(id);
			return node ? node[adapterForNode.children] || [] : [];
		},
		/**
		* 通过Path 获取子节点列表
		* @method getChildrenByPath
		* @param {Array} path 目标path。 若没有，则返回 treeData
		* @return {Array} 子节点列表
		*/
		getChildrenByPath: function(path){
			path = path || [];
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				node = null;
			if(path.length === 0){
				return _self.getTreeData();
			}else{
				node = _self.getNodeByPath(path);
				return node ? node[adapterForNode.children] || [] : [];
			}
		},
		/**
		* 获取节点的子节点列表
		* @method getChildrenByNode
		* @param {Object} node 目标节点
		* @return {Array} 子节点列表
		*/
		getChildrenByNode: function(node){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				children = [];
			if(node){
				children = node[adapterForNode.children] || [];			
			}else{
				children = [];
			}
			return children;
		},
		/**
		* 根据id 获取节点的全部叶子节点
		* @method getLeafsById
		* @param {String} id 目标节点Id
		* @return {Array} 叶子节点路径列表（pathNade）, 路径内不带当前节点，节点数据不带children属性
		*/
		getLeafsById: function(id){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				node = _self.getNodeById(id);
			return node ? _self.getLeafsByNode(node) : [];
		},
		/**
		* 根据节点 获取节点的全部叶子节点
		* @method getLeafsByNode
		* @param {Object} node 目标节点
		* @return {Array} 叶子节点路径列表（pathNade）, 路径内不带当前节点，节点数据不带children属性
		*/
		getLeafsByNode: function(node){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				_traverse,
				pathNode = [],
				leafsList = [];
					
			_traverse = function(nodeData, deep){
				deep = deep || 0;
				if(nodeData){
					for(var i = 0; i < nodeData.length; i++){
						var l = pathNode.length - deep - 1,
							node = nodeData[i];
						for(var j = 0; j < l; j++){
							pathNode.pop();
						}
						pathNode[deep] = node;
						if(node[adapterForNode.isleaf]){
							leafsList.push(_self.dataFilter(pathNode));
						}else{
							_traverse(node[adapterForNode.children], deep + 1);
						}
					}
				}
			};
			
			_traverse(_self.getChildrenByNode(node));
			
			return leafsList;
		},
		/**
		* 获取树的数据
		* @method getTreeData
		* @return {Array} 树数据
		*/
		getTreeData: function(){
			var _self = this;
			return _self.get('treeData');
		},
		/**
		* 手动填充树的数据 此方法会触发load事件
		* @method setTreeData
		* @param {Array} nodeData 带填充的节点列表
		* @param {String|Number} [id] 需要填充的节点id, (选填，若不填则当作整个树数据填充)
		*/
		setTreeData: function(nodeData, id){
			var _self = this;
			_self.fire('load', {data: nodeData, id: id});
		},
		/**
		* 通过文本搜索树 此方法会触发searchTree事件
		* @method searchTree
		* @param {String} searchText 要搜索的文本
		* @return {Object} 搜索结果
		*/
		searchTree: function(searchText){
			var _self = this,
				searchResult = _self.traverseTreeByText(searchText);

			_self.fire('searchTree', {
				text: searchText,
				pathList: searchResult.pathList,
				valuePathList: searchResult.valuePathList,
				result: searchResult
			});

			return searchResult;
		},
		/**
		* 将节点中的children属性过滤掉
		* @method dataFilter
		* @param {Array|Object} data 需要过滤的数据: 节点 或节点列表
		* @return {Array|Object} 过滤后的数据
		*/
		dataFilter: function(data){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				_data,
				_filter = function(n){
					return S.clone(n, function(v, k){
						if(k === adapterForNode.children){
							return false;
						}
					});
				};
				
			if(S.isArray(data)){
				_data = [];
				S.each(data, function(n){
					var filterData = _filter(n);
					_data.push(filterData);			
				});
			}else{
				_data = _filter(data);
			}

			return _data;
		},
		/**
		* 获取特定层级的树
		* @method getTreeByLevel
		* @param {Number} level 目标层级 跟节点为0级
		* @return {Array} 过滤后获取的数据
		*/
		getTreeByLevel: function(level){
			var _self = this,
				treeData = _self.getTreeData(),
				adapterForNode = _self.get('adapterForNode'),
				data = S.clone(treeData),
				_traverse;
			
			_traverse = function(nodeData, deep){
				deep = deep || 0;
				if(nodeData){
					for(var i = 0; i < nodeData.length; i++){
						var node = nodeData[i];
						if(deep === level - 1){
							node[adapterForNode.children] = [];
							node[adapterForNode.isleaf] = true;
						}else{
							_traverse(node[adapterForNode.children], deep + 1);
						}
					}
				}
			};
			
			if(level > 0){
				_traverse(data);
			}else{
				data = [];
			}

			return data;		
		},

		/**
		* 对象销毁
		* @method destroy
		*/
		destroy: function(){
			var _self = this;
			_self.detach();
			_self = null;
		},
		// 初始化
		_init: function(){
			var _self = this;
			_self.set('treeData', []);

			_self._initIdKey();

			_self._initEvent();

			if(_self.get('autoLoad')){
				_self.initLoad();
			}

		},
		// 初始化事件
		_initEvent: function(){		
			var _self = this;
			// 当load后把数据填充进treeData
			_self.on('load', function(e){
				_self._fillInTreeData(e.data, e.id);
			});
		},
		// 初始化idKey
		_initIdKey: function(){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				idKey = _self.get('idKey');
			if(!idKey){
				_self.set('idKey', adapterForNode.id);
			}
		},
		// 填充数据到treeData 若无id则作为整个树填充
		_fillInTreeData: function(data, id){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				nodeChildren = _self.getTreeData(),
				node;
			if(id){
				node = _self.getNodeById(id);
				if(node){
					nodeChildren = node[adapterForNode.children];
				}
			}
			nodeChildren.length = 0;
			S.each(data, function(n){
				nodeChildren.push(n);
			});
		},
		// 载入数据出错时调用
		_dataError: function(msg){
			var _self = this;
			if(msg){
				_self.get('dataErrorFunc')(msg);
			}
		},
		// 获取重载参数
		_getParam: function(param){
			var _self = this,
				idKey = _self.get('idKey'),
				lastParam = _self.get('lastParam') || _self.get('param'),
				loadParam = {};

			if(!!param && (S.isNumber(param) || S.isString(param))){
				// 若 param是id 则用idKey 配置参数对象
				loadParam[idKey] = param;
				loadParam = S.merge(lastParam, loadParam);
			}else if(!param || S.isEmptyObject(param)){
				// 取上一次参数或默认参数
				loadParam = lastParam;
			}else if(S.isPlainObject(param)){
				loadParam = param;
			}
			
			_self.set('lastParam', loadParam);
			return loadParam;		
		}

	});

	return Store; 

},{requires: ['core']});



/** 
* ViewStore 视图功能树专用数据缓冲对象
* @version 2.0
*/
KISSY.add('kg/trees/2.0.0/viewstore',function(S, Store){


	/**
	* ViewStore 视图功能树专用数据缓冲对象 继承自Tree.Store 拥有其全部配置项、方法及事件
	* @class Trees.ViewStore
	* @module Trees
	* @author 桐人<wwwfuzheng@qq.com>
	* @extend Trees.Store
	* @constructor ViewStore
	* @param {Object} config 配置项 同 Tree.Store配置项
	*/
	function ViewStore(config){
		var _self = this;
		config = S.merge(ViewStore.config, config);
		ViewStore.superclass.constructor.call(_self, config);
		//支持的事件
		_self.events = [	
			/**  
			* 增加路径时 触发此事件
			* @event pushPath
			* @param {event} e  事件对象
			* @param {String} e.id 增加的节点id
			* @param {Array} e.path 增加后的路径
			*/
			'pushPath',
			/**  
			* 减少路径时 触发此事件
			* @event  popPath
			* @param {event} e  事件对象
			* @param {String} e.id 减少的节点id
			* @param {Array} e.path 减少后的路径
			*/
			'popPath',
			/**  
			* 增加视图时 触发此事件
			* @event  pushView
			* @param {event} e  事件对象
			* @param {Object} e.view 增加的视图
			*/
			'pushView',
			/**  
			* 减少视图时 触发此事件
			* @event  popView
			* @param {event} e  事件对象
			* @param {Object} e.view 减少的视图
			*/
			'popView',
			/**  
			* 通过text遍历视图搜索后 触发此事件
			* @event  searchView
			* @param {event} e  事件对象
			* @param {String} e.text 搜索的文本值
			* @param {Array} e.data 搜索结果
			* @param {Number} e.index 搜索的视图在视图列表里的索引值
			*/
			'searchView',
			/**  
			* 视图选中项改变时 触发此事件
			* @event  changeSelect
			* @param {event} e  事件对象
			* @param {Array} e.view 视图对象
			* @param {Array} e.id 选中的节点id
			*/
			'changeSelect'
		];
		_self._initView();
	}

	S.extend(ViewStore, Store);

	S.augment(ViewStore, {
		/**
		* 获取视图管理器
		* @method getViewManager
		* @return {Object} 视图管理器
		*/
		getViewManager: function(){
			return this.get('viewManager');
		},
		/**
		* 通过path设置视图列表
		* @method getViewsByPath
		* @param {Array} path 选填，若没有则只返回一级菜单的视图
		* @return {Object} 视图管理器
		*/
		getViewsByPath: function(path){
			path = path || [];
			var _self = this,
				viewManager = _self.getViewManager(),
				viewPathLength = viewManager.viewPath.length,
				adapterForNode = _self.get('adapterForNode'),
				changeIndex = path.length,
				node = _self.getNodeByPath(path);
			_self.set('targetPath', path);
			// 确保数据已经准备好
			if(!_self.isTreeReady(node , function(){
				_self.getViewsByPath(path);
			})){
				return false;
			}
			// 若path为空，则先设置基础视图，及一级列表的视图
			if(path.length === 0){
				_self._setBaseView();
			}
			// 获取changIndex 即从哪个视图开始变化的索引
			S.each(path, function(id, i){
				if(id !== viewManager.viewPath[i]){
					changeIndex = i;
					return false;
				}
			});
			// 从堆栈内删除视图路径
			for(var j = 0; j < (viewPathLength - changeIndex); j++){
				_self._popViewPath();
			}
			// 按堆栈添加视图路径
			for(var k = changeIndex; k < path.length; k++){
				_self._pushViewPath(path[k]);
			}
			
			return viewManager;
		},
		/**
		* 通过id设置视图列表
		* @method getViewsById		
		* @param {String|Number} id 选填，若没有则至返回一级菜单的视图
		* @return {Object} 视图管理器
		*/
		getViewsById: function(id){
			var _self = this,
				path = _self.getPathById(id);
			return _self.getViewsByPath(path);		
		},
		/**
		* 通过view对象，获取视图的索引
		* @method getViewIndex		
		* @param {Object} view 视图对象
		* @return {Number} 视图的索引
		*/
		getViewIndex: function(view){
			var _self = this,
				viewManager = _self.getViewManager(),
				index = null;
			S.each(viewManager.views, function(v, i){
				if(v === view){
					index = i;
					return false;
				}
			});
			return index;
		},
		/**
		* 通过文本搜索视图 此方法会触发searchView事件
		* @method searchView		
		* @param {String} searchText 要搜索的文本
		* @param {Number} index 要搜索的视图索引
		* @return {Arrat} 搜索结果节点数据列表
		*/
		searchView: function(searchText, index){
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				viewManager = _self.getViewManager(),
				view = viewManager.views[index],
				searchData;

			searchText = searchText || '';
			searchData = S.filter(view.list, function(node){
				return node[adapterForNode.value].indexOf(searchText) > -1;
			});
				
			_self.fire('searchView', {data: searchData, index: index, text: searchText});

			return searchData;
		},
		// 初始化
		_initView: function(){
			var _self = this;
			_self._initViewManage();
			_self._initViewEvent();
		},
		// 初始化事件
		_initViewEvent: function(){		
			var _self = this;
			// 增加view
			_self.on('pushPath', function(e){
				_self._pushView(e.id, e.path);
			});
			// 减少view
			_self.on('popPath', function(e){
				_self._popView();
			});
		},

		// 初始化视图管理器
		_initViewManage: function(){
			var _self = this,
				viewManager = {
					viewPath: [],
					views: []
				};
			_self.set('viewManager', viewManager);		
		},
		// 初始化view 当path为[] 时 获取一级菜单
		_getViewByPath: function(path){
			path = path || [];
			var _self = this,
				view = {};
			view.list = _self._getDataOfView(path);
			view.selectedId = null;
			return view;
		},
		// 初始化一级菜单view 此方法会触发pushView事件
		_setBaseView: function(){
			var _self = this,
				viewManager = _self.getViewManager(),
				baseView;
			if(viewManager.views.length === 0){
				baseView = _self._getViewByPath();
				viewManager.views.push(baseView);
				_self.fire('pushView', {view: baseView});
			}
		},
		// 根据path 获取view的数据
		_getDataOfView: function(path){
			path = path || [];
			var _self = this,
				adapterForNode = _self.get('adapterForNode'),
				nodeData = _self.getChildrenByPath(path),
				viewData = _self.dataFilter(nodeData);
			return viewData;
		},
		// 增加path 触发pushPath事件
		_pushViewPath: function(id){		
			var _self = this,
				viewManager = _self.getViewManager();
			viewManager.viewPath.push(id);
			_self.fire('pushPath', {id: id, path: viewManager.viewPath});
			return viewManager.viewPath;
		},
		// 减少path 触发popPath事件
		_popViewPath: function(){		
			var _self = this,
				viewManager = _self.getViewManager(),
				id;
			if(viewManager.viewPath.length === 0){
				return;
			}
			id = viewManager.viewPath.pop();
			_self.fire('popPath', {id: id, path: viewManager.viewPath});
			return viewManager.viewPath;
		},
		// 增加view 触发pushView事件
		_pushView: function(id, path){
			var _self = this,
				viewManager = _self.getViewManager(),
				newView = _self._getViewByPath(path),
				baseView,
				lastView;

			_self._setBaseView();

			lastView = viewManager.views[viewManager.views.length - 1];
			_self._changeViewSelect(lastView, id);

			viewManager.views.push(newView);
			_self.fire('pushView', {view: newView});

			return newView;
		},
		// 减少view 触发popView事件
		_popView: function(){
			var _self = this,
				viewManager = _self.getViewManager(),
				popView,
				lastView;
			popView = viewManager.views.pop();
			_self.fire('popView', {view: popView});

			lastView = viewManager.views[viewManager.views.length - 1];
			if(lastView){
				_self._changeViewSelect(lastView, null);
			}

			return popView;
		},
		// 改变view的选中项 触发changeSelect事件
		_changeViewSelect: function(view, id){
			var _self = this;
			view.selectedId = id;
			_self.fire('changeSelect', {view: view, id: id});
		},
		// 销毁ViewStore 清空 viewManager
		_destroyView: function(){
			var _self = this,
				viewManager = _self.getViewManager();
			viewManager.viewPath = [];
			viewManager.views = [];
		}
	});

	return ViewStore;

},{requires: ['./store']});



