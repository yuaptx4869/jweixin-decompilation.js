! function(global, factory) {
	"function" == typeof define && (define.amd || define.cmd) ? define(function() {
		return factory(global)
	}) : factory(global, true)
}(this, function(global, isGlobalMode) {
	function invoke(sdkName, args, handler) {
		global.WeixinJSBridge ? WeixinJSBridge.invoke(sdkName, addVerifyInfo(args), function(res) {
			execute(sdkName, res, handler)
		}) : logEventInfo(sdkName, handler);
	}

	function on(sdkName, listener, handler) {
		global.WeixinJSBridge ? WeixinJSBridge.on(sdkName, function(res) {
			handler && handler.trigger && handler.trigger(res);
			execute(sdkName, res, listener);
		}) : (handler ? logEventInfo(sdkName, handler) : logEventInfo(sdkName, listener));
	}

	function addVerifyInfo(data) {
		data = data || {};
		data.appId = settings.appId;
		data.verifyAppId = settings.appId;
		data.verifySignType = "sha1";
		data.verifyTimestamp = settings.timestamp + "";
		data.verifyNonceStr = settings.nonceStr;
		data.verifySignature = settings.signature;

		return data;
	}

	function execute(sdkName, res, handler) {
		"openEnterpriseChat" == sdkName && (res.errCode = res.err_code);
		delete res.err_code, delete res.err_desc, delete res.err_detail;
		var errMsg = res.errMsg;
		errMsg || (errMsg = res.err_msg, delete res.err_msg, errMsg = formatErrMsg(sdkName, errMsg), res.errMsg = errMsg);
		handler = handler || {};
		handler._complete && (handler._complete(res), delete handler._complete);
		errMsg = res.errMsg || "";
		settings.debug && !handler.isInnerInvoke && alert(JSON.stringify(res));
		var separatorIndex = errMsg.indexOf(":"),
			status = errMsg.substring(separatorIndex + 1);
		switch (status) {
			case "ok":
				handler.success && handler.success(res);
				break;
			case "cancel":
				handler.cancel && handler.cancel(res);
				break;
			default:
				handler.fail && handler.fail(res)
		}
		handler.complete && handler.complete(res)
	}

	function formatErrMsg(sdkName, errMsg) {
		var name = sdkName,
			event = sdkNameEventMap[sdkName];
		event && (name = event);
		var status = "ok";
		if (errMsg) {
			var separatorIndex = errMsg.indexOf(":");
			status = errMsg.substring(separatorIndex + 1);
			"confirm" == status && (status = "ok");
			"failed" == status && (status = "fail"); - 1 != status.indexOf("failed_") && (status = status.substring(7)); - 1 != status.indexOf("fail_") && (status = status.substring(5));
			status = status.replace(/_/g, " ");
			status = status.toLowerCase();
			("access denied" == status || "no permission to execute" == status) && (status = "permission denied");
			"config" == sdkName && "function not exist" == status && (status = "ok");
			"" == status && (status = "fail");
		}
		return errMsg = name + ":" + status;
	}

	function eventArrToSdkNameArr(jsApiList) {
		if (jsApiList) {
			for (var i = 0, length = jsApiList.length; length > i; ++i) {
				var event = jsApiList[i],
					sdkName = eventSdkNameMap[event];
				sdkName && (jsApiList[i] = sdkName);
			}
			return jsApiList;
		}
	}

	function logEventInfo(name, data) {
		if (!(!settings.debug || data && data.isInnerInvoke)) {
			var event = sdkNameEventMap[name];
			event && (name = event);
			data && data._complete && delete data._complete;
			console.log('"' + name + '",', data || "")
		}
	}

	function report(data) {
		if (!(isNormalPC || isWeixinDeBugger || settings.debug || "6.0.2" > weixinVersion || info.systemType < 0)) {
			var img = new Image;
			info.appId = settings.appId;
			info.initTime = loadTimeInfo.initEndTime - loadTimeInfo.initStartTime;
			info.preVerifyTime = loadTimeInfo.preVerifyEndTime - loadTimeInfo.preVerifyStartTime;
			jWeixin.getNetworkType({
				isInnerInvoke: true,
				success: function(res) {
					info.networkType = res.networkType;
					var reportUrl = "https://open.weixin.qq.com/sdk/report?v=" + info.version + "&o=" + info.isPreVerifyOk + "&s=" + info.systemType + "&c=" + info.clientVersion + "&a=" + info.appId + "&n=" + info.networkType + "&i=" + info.initTime + "&p=" + info.preVerifyTime + "&u=" + info.url;
					img.src = reportUrl;
				}
			});
		}
	}

	function getTime() {
		return new Date().getTime();
	}

	function startup(callback) {
		isWeixin && (global.WeixinJSBridge ? callback() : document.addEventListener && document.addEventListener("WeixinJSBridgeReady", callback, false))
	}

	function enableBetaApi() {
		jWeixin.invoke || (jWeixin.invoke = function(sdkName, args, handler) {
			global.WeixinJSBridge && WeixinJSBridge.invoke(sdkName, addVerifyInfo(args), handler)
		}, jWeixin.on = function(sdkName, args) {
			global.WeixinJSBridge && WeixinJSBridge.on(sdkName, args)
		});
	}

	if (!global.jWeixin) {
		var eventSdkNameMap = {
				config: "preVerifyJSAPI",
				onMenuShareTimeline: "menu:share:timeline",
				onMenuShareAppMessage: "menu:share:appmessage",
				onMenuShareQQ: "menu:share:qq",
				onMenuShareWeibo: "menu:share:weiboApp",
				onMenuShareQZone: "menu:share:QZone",
				previewImage: "imagePreview",
				getLocation: "geoLocation",
				openProductSpecificView: "openProductViewWithPid",
				addCard: "batchAddCard",
				openCard: "batchViewCard",
				chooseWXPay: "getBrandWCPayRequest",
				openEnterpriseRedPacket: "getRecevieBizHongBaoRequest",
				startSearchBeacons: "startMonitoringBeacons",
				stopSearchBeacons: "stopMonitoringBeacons",
				onSearchBeacons: "onBeaconsInRange",
				consumeAndShareCard: "consumedShareCard",
				openAddress: "editAddress"
			},
			sdkNameEventMap = (function() {
				var map = {};
				for (var i in eventSdkNameMap)
					map[eventSdkNameMap[i]] = i;
				return map;
			})(),
			document = global.document,
			title = document.title,
			uaLowerCase = navigator.userAgent.toLowerCase(),
			platLowerCase = navigator.platform.toLowerCase(),
			isNormalPC = !(!uaLowerCase.match('mac') && !uaLowerCase.match('win')),
			isWeixinDeBugger = uaLowerCase.indexOf('wxdebugger') != -1,
			isWeixin = uaLowerCase.indexOf('micromessenger') != -1,
			isAndroid = uaLowerCase.indexOf('android') != -1,
			isIOs = uaLowerCase.indexOf('iphone') != -1 || uaLowerCase.indexOf('ipad') != -1,
			weixinVersion = (function() {
				var version = uaLowerCase.match(/micromessenger\/(\d+\.\d+\.\d+)/) || uaLowerCase.match(/micromessenger\/(\d+\.\d+)/);
				return version ? version[1] : ''
			})(),
			loadTimeInfo = {
				initStartTime: getTime(),
				initEndTime: 0,
				preVerifyStartTime: 0,
				preVerifyEndTime: 0
			},
			info = {
				version: 1,
				appId: "",
				initTime: 0,
				preVerifyTime: 0,
				networkType: "",
				isPreVerifyOk: 1,
				systemType: isIOs ? 1 : isAndroid ? 2 : -1,
				clientVersion: weixinVersion,
				url: encodeURIComponent(location.href)
			},
			settings = {},
			handler = {
				_completes: []
			},
			resource = {
				state: 0,
				data: {}
			};

		var jWeixin = {
				config: function(data) {
					settings = data;
					logEventInfo("config", data);
					var needCheck = settings.check === false ? false : true;
					startup(function() {
						if (needCheck) {
							invoke(eventSdkNameMap.config, {
								verifyJsApiList: eventArrToSdkNameArr(settings.jsApiList)
							}, function() {
								handler._complete = function(data) {
									loadTimeInfo.preVerifyEndTime = getTime();
									resource.state = 1;
									resource.data = data;
								};
								handler.success = function(data) {
									info.isPreVerifyOk = 0;
								};
								handler.fail = function(data) {
									handler._fail ? handler._fail(data) : resource.state = -1;
								};
								var _completes = handler._completes;
								_completes.push(function() {
									report();
								});
								handler.complete = function(data) {
									for (var i = 0, length = _completes.length; length > i; ++i) {
										_completes[i]();
									}
								};
								handler._completes = [];
								return handler;
							}());
							loadTimeInfo.preVerifyStartTime = getTime();
						} else {
							resource.state = 1;
							var _completes = handler._completes;
							for (var i = 0, length = _completes.length; length > i; ++i) {
								_completes[i]();
							}
							handler._completes = [];
						}
					});
					settings.beta && enableBetaApi();
				},
				ready: function(callback) {
					0 != resource.state ? callback() : (handler._completes.push(callback), !isWeixin && settings.debug && callback())
				},
				error: function(callback) {
					"6.0.2" > weixinVersion || (-1 == resource.state ? callback(resource.data) : handler._fail = callback)
				},
				checkJsApi: function(data) {
					var formatResultData = function(data) {
						var checkResult = data.checkResult;
						for (var key in checkResult) {
							var event = sdkNameEventMap[key];
							event && (checkResult[event] = checkResult[key], delete checkResult[key]);
						}
						return data;
					};
					invoke("checkJsApi", {
						jsApiList: eventArrToSdkNameArr(data.jsApiList)
					}, function() {
						data._complete = function(data) {
							if (isAndroid) {
								var resultStr = data.checkResult;
								resultStr && (data.checkResult = JSON.parse(resultStr));
							}
							data = formatResultData(data);
						};
						return data;
					}());
				},
				onMenuShareTimeline: function(data) {
					on(eventSdkNameMap.onMenuShareTimeline, {
						complete: function() {
							invoke("shareTimeline", {
								title: data.title || title,
								desc: data.title || title,
								img_url: data.imgUrl || "",
								link: data.link || location.href,
								type: data.type || "link",
								data_url: data.dataUrl || ""
							}, data);
						}
					}, data);
				},
				onMenuShareAppMessage: function(data) {
					on(eventSdkNameMap.onMenuShareAppMessage, {
						complete: function() {
							invoke("sendAppMessage", {
								title: data.title || title,
								desc: data.desc || "",
								link: data.link || location.href,
								img_url: data.imgUrl || "",
								type: data.type || "link",
								data_url: data.dataUrl || ""
							}, data);
						}
					}, data);
				},
				onMenuShareQQ: function(data) {
					on(eventSdkNameMap.onMenuShareQQ, {
						complete: function() {
							invoke("shareQQ", {
								title: data.title || title,
								desc: data.desc || "",
								img_url: data.imgUrl || "",
								link: data.link || location.href
							}, data);
						}
					}, data);
				},
				onMenuShareWeibo: function(data) {
					on(eventSdkNameMap.onMenuShareWeibo, {
						complete: function() {
							invoke("shareWeiboApp", {
								title: data.title || title,
								desc: data.desc || "",
								img_url: data.imgUrl || "",
								link: data.link || location.href
							}, data);
						}
					}, data);
				},
				onMenuShareQZone: function(data) {
					on(eventSdkNameMap.onMenuShareQZone, {
						complete: function() {
							invoke("shareQZone", {
								title: data.title || title,
								desc: data.desc || "",
								img_url: data.imgUrl || "",
								link: data.link || location.href
							}, data);
						}
					}, data);
				},
				getNetworkType: function(data) {
					var formatErrMsg = function(res) {
						var errMsg = res.errMsg;
						res.errMsg = "getNetworkType:ok";
						var subtype = res.subtype;
						delete res.subtype
						if (subtype)
							res.networkType = subtype;
						else {
							var separatorIndex = errMsg.indexOf(":"),
								status = errMsg.substring(separatorIndex + 1);
							switch (status) {
								case "wifi":
								case "edge":
								case "wwan":
									res.networkType = status;
									break;
								default:
									res.errMsg = "getNetworkType:fail"
							}
						}
						return res;
					};
					invoke("getNetworkType", {}, function() {
						data._complete = function(res) {
							res = formatErrMsg(res);
						};
						return data;
					}());
				},
				getLocation: function(data) {
					data = data || {};
					invoke(eventSdkNameMap.getLocation, {
						type: data.type || "wgs84"
					}, function() {
						data._complete = function(res) {
							delete res.type
						};
						return data;
					}());
				},
				hideOptionMenu: function(data) {
					invoke("hideOptionMenu", {}, data);
				},
				showOptionMenu: function(data) {
					invoke("showOptionMenu", {}, data);
				},
				closeWindow: function(data) {
					data = data || {};
					invoke("closeWindow", {}, data);
				},
				hideMenuItems: function(data) {
					invoke("hideMenuItems", {
						menuList: data.menuList
					}, data);
				},
				showMenuItems: function(data) {
					invoke("showMenuItems", {
						menuList: data.menuList
					}, data);
				},
				hideAllNonBaseMenuItem: function(data) {
					invoke("hideAllNonBaseMenuItem", {}, data);
				},
				showAllNonBaseMenuItem: function(data) {
					invoke("showAllNonBaseMenuItem", {}, data);
				},
				scanQRCode: function(data) {
					data = data || {};
					invoke("scanQRCode", {
						needResult: data.needResult || 0,
						scanType: data.scanType || ["qrCode", "barCode"]
					}, function() {
						data._complete = function(res) {
							if (isIOs) {
								var resultStr = res.resultStr;
								if (resultStr) {
									var result = JSON.parse(resultStr);
									res.resultStr = result && result.scan_code && result.scan_code.scan_result
								}
							}
						};
						return data;
					}());
				}
			},
			next_iOSLocalImgId = 1,
			iOS_LocalImgMap = {};

		// 兼容 iOS WKWebview 不支持 localId 直接显示图片的问题
		document.addEventListener("error", function(event) {
			if (!isAndroid) {
				var target = event.target,
					targetTagName = target.tagName,
					targetSrc = target.src;
				if ("IMG" == targetTagName || "VIDEO" == targetTagName || "AUDIO" == targetTagName || "SOURCE" == targetTagName) {
					var isWxlocalresource = targetSrc.indexOf("wxlocalresource://") != -1;
					if (isWxlocalresource) {
						event.preventDefault(), event.stopPropagation();
						var wxId = target["wx-id"];
						wxId || (wxId = next_iOSLocalImgId++, target["wx-id"] = wxId);
						if (iOS_LocalImgMap[wxId]) {
							return;
						}
						iOS_LocalImgMap[wxId] = true;
						wx.ready(function() {
							wx.getLocalImgData({
								localId: targetSrc,
								success: function(res) {
									target.src = res.localData
								}
							})
						});
					}
				}
			}
		}, true);
		document.addEventListener("load", function(event) {
			if (!isAndroid) {
				var target = event.target,
					targetTagName = target.tagName,
					targetSrc = target.src;
				if ("IMG" == targetTagName || "VIDEO" == targetTagName || "AUDIO" == targetTagName || "SOURCE" == targetTagName) {
					var wxId = target["wx-id"];
					wxId && (iOS_LocalImgMap[wxId] = false);
				}
			}
		}, true);

		return isGlobalMode && (global.wx = global.jWeixin = jWeixin), jWeixin

	}
});
