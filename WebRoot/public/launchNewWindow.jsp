<%@ page session="false" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %><%
	// Set to expire far in the past.
	response.setHeader("Expires", "Tue, 24 Jan 2000 17:46:50 GMT");

	// Set standard HTTP/1.1 no-cache headers.
	response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

	// Set standard HTTP/1.0 no-cache header.
	response.setHeader("Pragma", "no-cache");
%><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<!--
 launchNewWindow.jsp
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZPL 1.2
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.2 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is: Zimbra Collaboration Suite Web Client
 *
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
 * All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK *****
-->
<html>
<head>
<%
	String contextPath = request.getContextPath();
	if(contextPath.equals("/")) contextPath = "";

    String skin = request.getParameter("skin");
    if (skin == null) {
        skin = "sand";
    }

	String mode = (String) request.getAttribute("mode");
	Boolean inDevMode = (mode != null) && (mode.equalsIgnoreCase("mjsf"));

	String vers = (String) request.getAttribute("version");
	if (vers == null) vers = "";

	String ext = (String) request.getAttribute("fileExtension");
	if (ext == null) ext = "";

    Boolean inSkinDebugMode = (mode != null) && (mode.equalsIgnoreCase("skindebug"));
%>
<fmt:setLocale value='${pageContext.request.locale}' scope='request' />
<title><fmt:setBundle basename="/messages/ZmMsg"/><fmt:message key="zimbraTitle"/></title>
<script type="text/javascript" language="javascript">
	appContextPath = "<%= contextPath %>";
	appCurrentSkin = "<%=skin %>";
</script>

<% request.setAttribute("res", "I18nMsg,AjxMsg,ZMsg,ZmMsg,AjxKeys,ZmKeys"); %>
<jsp:include page="Resources.jsp"/>
<style type="text/css">
	<!--
    @import url(<%= contextPath %>/css/common,dwt,msgview,login,zm,spellcheck,wiki,images,skin.css?v=<%= vers %><%= inSkinDebugMode || inDevMode ? "&debug=1" : "" %>&skin=<%= skin %>);
    -->
</style>

<jsp:include page="Boot.jsp"/>
<%
    String packages = "Ajax,Zimbra,Startup1,Startup2,CalendarCore,ContactsCore,PreferencesCore,MailCore,Mail";

    String extraPackages = request.getParameter("packages");
    if (extraPackages != null) packages += ","+extraPackages;

    String pprefix = inDevMode ? "public/jsp" : "js";
    String psuffix = inDevMode ? ".jsp" : "_all.js";

    String[] pnames = packages.split(",");
    for (String pname : pnames) {
        String pageurl = "/"+pprefix+"/"+pname+psuffix;
        if (inDevMode) { %>
            <jsp:include>
                <jsp:attribute name='page'><%=pageurl%></jsp:attribute>
            </jsp:include>
        <% } else { %>
            <script type="text/javascript" src="<%=contextPath%><%=pageurl%><%=ext%>?v=<%=vers%>"></script>
        <% } %>
    <% }
%>
<script type="text/javascript">
AjxEnv.DEFAULT_LOCALE = "<%=request.getLocale()%>";
</script>

    <script type="text/javascript" language="JavaScript">
		var cacheKillerVersion = "<%= vers %>";
		function launch() {
			AjxWindowOpener.HELPER_URL = "<%=contextPath%>/public/frameOpenerHelper.jsp"
			DBG = new AjxDebug(AjxDebug.NONE, null, false);
			ZmNewWindow.run();
		}
		AjxCore.addOnloadListener(launch);
		AjxCore.addOnunloadListener(ZmNewWindow.unload);
	</script>
</head>
<body/>
</html>