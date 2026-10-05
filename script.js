/* SoilSafe app bootstrap guard: prevents duplicate execution when a local dev server/browser cache loads script.js twice. */
if (window.__SOILSAFE_APP_LOADED__) {
  console.warn("SoilSafe: duplicate script.js load ignored.");
} else {
  window.__SOILSAFE_APP_LOADED__ = true;
  (function () {
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const sbReady=Boolean(window.SOILSAFE_SUPABASE_URL && !window.SOILSAFE_SUPABASE_URL.startsWith("YOUR_") && window.SOILSAFE_SUPABASE_ANON_KEY && !window.SOILSAFE_SUPABASE_ANON_KEY.startsWith("YOUR_"));
const supabase=sbReady?window.supabase.createClient(window.SOILSAFE_SUPABASE_URL,window.SOILSAFE_SUPABASE_ANON_KEY):null;
let user=null,isAdmin=false,records=[],notifications=[],profile=null;

function solutionFor(c){c=String(c).toLowerCase();if(c.includes("plastic")||c.includes("waste"))return"Prevent further accumulation, segregate the waste and route it through the appropriate waste-management system.";if(c.includes("oil")||c.includes("chemical"))return"Keep people away from the area and notify the appropriate environmental authority. Do not touch or spread the material.";if(c.includes("wastewater")||c.includes("sewage"))return"Avoid contact and report the discharge to the relevant maintenance or environmental authority for inspection.";if(c.includes("construction"))return"Keep debris contained and request appropriate collection or disposal so material does not spread.";if(c.includes("agricultural"))return"Document the activity and seek appropriate agronomic or environmental guidance. Chemical identity requires evidence.";return"Request an appropriate site inspection. Laboratory testing may be needed before identifying a contaminant.";}
function statusLabel(s){return s==="review"?"Under review":s==="responded"?"Response suggested":s==="confirmed"?"Resolved":"New report";}
function evidenceLabel(s){return s==="investigation"?"Further investigation":s==="laboratory"?"Laboratory confirmed":"Visual observation";}
function normalize(r){return{id:r.id,problemNumber:r.problem_number||r.id,user_id:r.user_id,reporter:r.reporter||"Anonymous",reporterType:r.reporter_type||"other_place",location:r.location||"Unknown location",category:r.category||"Other soil-related concern",date:r.date_noticed||today(),description:r.description||"",photo:r.photo_url||"",status:r.status||"new",statusLabel:statusLabel(r.status||"new"),evidenceLevel:r.evidence_level||"visual",evidenceLabel:evidenceLabel(r.evidence_level||"visual"),solution:r.solution||solutionFor(r.category||""),adminMessage:r.admin_message||"",resolvedAt:r.resolved_at||null,createdAt:r.created_at||null,updatedAt:r.updated_at||null};}
function showCloudMessage(t){const e=document.getElementById("formMessage");if(e)e.textContent=t;}
async function getSession(){if(!supabase)return null;const {data}=await supabase.auth.getSession();return data.session?.user||null;}
async function loadProfile(){isAdmin=false;profile=null;if(!supabase||!user)return;const {data,error}=await supabase.from("profiles").select("full_name,role,bio,city,affiliation_type,avatar_url,created_at,updated_at").eq("id",user.id).maybeSingle();if(error){console.warn("Profile load:",error.message);return;}profile=data||null;isAdmin=data?.role==="admin";}
async function loadReports(){if(!supabase||!user){records=[];return;}const {data,error}=await supabase.from("reports").select("*").order("created_at",{ascending:false});if(error){console.error(error);records=[];showCloudMessage("Your online records could not be loaded. Check the database setup.");return;}records=(data||[]).map(normalize);}
async function loadNotifications(){if(!supabase||!user){notifications=[];return;}const {data,error}=await supabase.from("notifications").select("*").order("created_at",{ascending:false}).limit(30);if(error){console.warn("Notification load:",error.message);notifications=[];return;}notifications=data||[];renderNotifications();}
function updateAuthUI(){const login=document.getElementById("loginBtn");if(login)login.textContent=user?(isAdmin?"Admin account":"My profile"):"Login";document.getElementById("logoutBtn").style.display=user?"inline-flex":"none";document.getElementById("adminNav").classList.toggle("hidden",!isAdmin);document.getElementById("admin").classList.toggle("hidden",!isAdmin);document.getElementById("notificationBtn")?.classList.toggle("hidden",!user);document.getElementById("mobileNotifyBtn")?.classList.toggle("hidden",!user);const unread=notifications.filter(n=>!n.read_at).length;const count=document.getElementById("notificationCount");if(count)count.textContent=unread;const nb=document.getElementById("notificationBtn");if(nb)nb.setAttribute("aria-label",unread?`${unread} unread notifications`:"Notifications");if(user)renderProfile();}

/* science */
const layerContent={top:["01 — TOPSOIL","Often rich in organic matter and biological activity. Pollution can affect soil organisms and plant growth depending on the contaminant and exposure."],sub:["02 — SUBSOIL","Water and dissolved substances can move through subsoil. Movement depends on texture, pH, organic matter and the chemical involved."],parent:["03 — PARENT MATERIAL","Weathered rock and minerals help form soil. Some elements occur naturally, so identifying contamination requires context and appropriate testing."]};
document.querySelectorAll(".soil-select").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".soil-select").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");const c=layerContent[btn.dataset.layer];document.getElementById("layerDescription").innerHTML=`<b>${c[0]}</b><p>${c[1]}</p>`;}));
const phSlider=document.getElementById("phSlider");
function updatePH(){const ph=Number(phSlider.value);document.getElementById("phValue").textContent=ph.toFixed(1);let label="NEAR NEUTRAL",title="Near neutral",text="Many plants grow well in slightly acidic to neutral soil, but ideal pH varies by species and soil conditions.";if(ph<6.5){label=ph<5.5?"ACIDIC":"SLIGHTLY ACIDIC";title="Acidic conditions";text="Lower pH can increase the mobility of some metals. The actual effect depends on the soil and the specific substance."}if(ph>7.5){label=ph>8.5?"ALKALINE":"SLIGHTLY ALKALINE";title="Alkaline conditions";text="Higher pH can reduce the mobility of some metals while affecting nutrient availability. Responses differ by substance."}document.getElementById("phLabel").textContent=label;document.getElementById("phInsight").innerHTML=`<span>✳</span><p><b>${title}</b><small>${text}</small></p>`;}phSlider.addEventListener("input",updatePH);

/* report form */
document.getElementById("date").value=today();let photoFile=null;
document.getElementById("photo").addEventListener("change",e=>{const f=e.target.files?.[0],p=document.getElementById("photoPreview");if(!f)return;if(f.size>2.5*1024*1024){e.target.value="";photoFile=null;p.style.display="block";p.innerHTML='<div class="form-message">Please choose a photo smaller than 2.5 MB.</div>';return}photoFile=f;const reader=new FileReader();reader.onload=x=>{p.innerHTML=`<img src="${x.target.result}" alt="Selected observation photo">`;p.style.display="block"};reader.readAsDataURL(f);});
async function uploadPhoto(file,id){if(!supabase||!file)return null;const ext=file.name.split(".").pop().toLowerCase();const path=`${user.id}/${id}.${ext}`;const {error}=await supabase.storage.from("report-evidence").upload(path,file,{upsert:true,contentType:file.type});if(error)throw error;return supabase.storage.from("report-evidence").getPublicUrl(path).data.publicUrl;}

document.getElementById("reportForm").addEventListener("submit",async e=>{e.preventDefault();const msg=document.getElementById("formMessage");if(!sbReady){msg.textContent="Online reporting is not connected yet. Add your Supabase project URL and anon key in supabase-config.js.";return}if(!user){document.getElementById("loginModal").classList.add("open");msg.textContent="Login is required to save and track a report across devices.";return}const location=document.getElementById("location").value.trim(),desc=document.getElementById("description").value.trim();if(!location||!desc){msg.textContent="Please add the location and describe the observation.";return}const category=document.getElementById("category").value,evidenceLevel=document.getElementById("evidenceLevel").value,reporterType=document.getElementById("reporterType").value,tempId=crypto.randomUUID?crypto.randomUUID():"00000000-0000-4000-8000-"+String(Date.now()).slice(-12);msg.textContent="Saving your record online…";try{const photoUrl=photoFile?await uploadPhoto(photoFile,tempId):null;const {data,error}=await supabase.from("reports").insert({id:tempId,user_id:user.id,reporter:document.getElementById("reporter").value.trim()||"Anonymous",reporter_type:reporterType,location,category,date_noticed:document.getElementById("date").value||today(),description,photo_url:photoUrl,status:"new",evidence_level:evidenceLevel,solution:solutionFor(category)}).select().single();if(error)throw error;records.unshift(normalize(data));e.target.reset();document.getElementById("date").value=today();photoFile=null;document.getElementById("photoPreview").innerHTML="";document.getElementById("photoPreview").style.display="none";msg.textContent=`Record submitted online. Your Problem Number is ${data.problem_number}. Save this number to track the report.`;renderAll();await loadNotifications();document.getElementById("trackProblemNumber").value=data.problem_number||"";document.getElementById("records").scrollIntoView({behavior:"smooth"});}catch(err){console.error(err);msg.textContent="Could not submit the record: "+(err.message||"unknown error");}});

/* example records — clearly marked illustrative, never presented as real reports */
const exampleRecords=[
 {id:"EX-1042",category:"Solid waste / plastic",location:"Example · urban roadside",date:"2026-09-21",description:"Mixed plastic packaging and food wrappers were visible along the edge of an open drain. No claim about soil contamination was made.",type:"other_place",level:"Visual observation"},
 {id:"EX-1038",category:"Oil / chemical spill",location:"Example · vehicle service area",date:"2026-09-18",description:"A dark oily patch was visible on bare ground beside a service area. The source and chemical identity were not established.",type:"other_place",level:"Further investigation"},
 {id:"EX-1034",category:"Agricultural / chemical use",location:"Example · agricultural field",date:"2026-09-14",description:"An area of soil with an unusual surface appearance was documented after agricultural activity. Further assessment would be needed.",type:"other_place",level:"Visual observation"},
 {id:"EX-1029",category:"Construction / debris",location:"Example · construction edge",date:"2026-09-08",description:"Broken concrete, packaging and fine dust were visible near an active construction boundary.",type:"lpu_student",level:"Visual observation"},
 {id:"EX-1022",category:"Wastewater / sewage",location:"Example · residential lane",date:"2026-09-03",description:"Standing wastewater was observed flowing toward exposed soil after a drainage overflow. The material was not handled.",type:"other_place",level:"Further investigation"},
 {id:"EX-1016",category:"Unusual soil appearance",location:"Example · community garden",date:"2026-08-28",description:"A small patch of discoloured soil was photographed for follow-up. Appearance alone was not treated as proof of contamination.",type:"lpu_student",level:"Visual observation"}
];
function renderExampleRecords(){const el=document.getElementById("exampleRecordsGrid");el.innerHTML=exampleRecords.map(r=>`<article class="record-card"><div class="record-card-top"><span class="record-code">${r.id}</span><span class="record-example">ILLUSTRATIVE</span></div><div class="record-card-body"><h3>${esc(r.category)}</h3><p>${esc(r.description)}</p><div class="record-meta"><span>📍 ${esc(r.location)}</span><span>◷ ${esc(r.date)}</span><span>${r.type==="lpu_student"?"LPU student":"Another place"}</span></div></div><div class="record-level">EVIDENCE: ${esc(r.level.toUpperCase())}</div></article>`).join("");}
function renderMyRecords(){const count=records.length,review=records.filter(r=>r.status==="review").length,response=records.filter(r=>["responded","confirmed"].includes(r.status)).length;document.getElementById("myRecordCount").textContent=count;document.getElementById("myReviewCount").textContent=review;document.getElementById("myResponseCount").textContent=response;const panel=document.getElementById("myRecordsPanel");if(!user){panel.innerHTML='<div class="my-record-empty">Login to see your own online records, Problem Numbers, review status and responses here.</div>';return}if(!records.length){panel.innerHTML='<div class="my-record-empty">You have no online records yet. Use the Report section to create your first record.</div>';return}panel.innerHTML=`<div class="my-record-table"><div class="my-record-table-head"><span>PROBLEM NO.</span><span>OBSERVATION</span><span>STATUS</span><span>FOLLOW-UP</span></div>${records.map(r=>`<div class="my-record-row"><span><b>${esc(r.problemNumber)}</b><br><small>${esc(r.date)}</small></span><span>${esc(r.category)}<br><small>📍 ${esc(r.location)}</small></span><span>${esc(r.statusLabel)}</span><span>${esc(r.solution||r.adminMessage||"Awaiting review")}</span></div>`).join("")}</div>`;}
function renderCommunity(){const filter=document.getElementById("filter").value,rows=filter==="all"?records:records.filter(r=>r.status===filter),grid=document.getElementById("reportsGrid");grid.innerHTML=rows.length?rows.map(r=>`<article class="report-item">${r.photo?`<img class="report-item-photo" src="${esc(r.photo)}" alt="Reported observation">`:""}<div class="report-body"><div class="report-top"><span class="badge">${esc(r.statusLabel)}</span><span class="report-date">${esc(r.date)}</span></div><h3>${esc(r.category)}</h3><div class="report-location">📍 ${esc(r.location)} · ${r.reporterType==="lpu_student"?"LPU student":"Another place"}</div><p>${esc(r.description)}</p><div class="solution"><b>STATUS / SUGGESTED RESPONSE</b>${esc(r.solution)}</div></div></article>`).join(""):'<div class="empty">No live community reports are available in this view yet.<br>Example records above show how responsible documentation works.</div>';}
function renderAnalytics(){const total=records.length,td=records.filter(r=>r.date===today()).length,ph=records.filter(r=>r.photo).length,rv=records.filter(r=>r.status==="review").length;["statReports","heroReports"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=total});["statToday","heroToday"].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=td});const e=document.getElementById("statPhoto");if(e)e.textContent=ph;["statReview","heroFollow"].forEach(id=>{const x=document.getElementById(id);if(x)x.textContent=rv});const counts={};records.forEach(r=>counts[r.category]=(counts[r.category]||0)+1);const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);const chart=document.getElementById("categoryChart");if(chart)chart.innerHTML=sorted.length?sorted.map(([n,v])=>`<div class="category-row"><span>${esc(n)}</span><div class="category-track"><div class="category-fill" style="width:${Math.max(6,v/total*100)}%"></div></div><b>${v}</b></div>`).join(""):'<div class="empty-chart">Login and create records to populate live analytics.</div>';const activity=document.getElementById("activityChart");if(activity){const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-i));return d}),vals=days.map(d=>records.filter(r=>{const x=new Date(r.date);return !isNaN(x)&&x.toDateString()===d.toDateString()}).length),max=Math.max(1,...vals);activity.innerHTML=`<div class="activity-bars">${days.map((d,i)=>`<div class="activity-day"><div class="activity-bar" style="height:${Math.max(3,vals[i]/max*125)}px" title="${vals[i]} record(s)"></div><small>${d.toLocaleDateString(undefined,{weekday:"short"})}</small></div>`).join("")}</div>`;}}
function renderAll(){renderExampleRecords();renderMyRecords();renderCommunity();renderAnalytics();if(isAdmin)renderAdmin();}
document.getElementById("filter").addEventListener("change",renderCommunity);

document.getElementById("recordsLoginBtn").addEventListener("click",()=>{if(user)document.getElementById("report").scrollIntoView({behavior:"smooth"});else document.getElementById("loginModal").classList.add("open");});

/* tracking */

function renderTrackResult(r){
  const box = document.getElementById("trackResult");

  if(!box) return;

  if(!r){
    box.innerHTML = "";
    return;
  }

  box.innerHTML = `
    <div class="track-result-card">

      <div class="track-result-top">
        <div>
          <small>SOILSAFE PROBLEM NUMBER</small>
          <strong>${esc(r.problemNumber)}</strong>
        </div>

        <span class="badge">${esc(r.statusLabel)}</span>
      </div>

      <div class="track-grid">

        <div>
          <small>REPORT</small>
          <b>${esc(r.category)}</b>
          <span>${esc(r.description)}</span>
        </div>

        <div>
          <small>LOCATION</small>
          <b>${esc(r.location)}</b>
          <span>Noticed ${esc(r.date)}</span>
        </div>

      </div>

      <div class="track-response">
        <small>SOILSAFE RESPONSE</small>

        <p>
          ${esc(
            r.adminMessage ||
            r.solution ||
            "Your report is waiting for review."
          )}
        </p>
      </div>

      ${
        r.photo
          ? `
            <a
              class="track-photo-link"
              href="${esc(r.photo)}"
              target="_blank"
              rel="noreferrer"
            >
              View evidence photo ↗
            </a>
          `
          : ""
      }

      <div class="track-actions">

        <button
          type="button"
          class="btn btn-primary"
          onclick="openReportEditor('${esc(r.id)}')"
        >
          Update Report
        </button>

      </div>

    </div>

    <div
      id="reportEditPanel"
      class="report-edit-panel"
      hidden
    ></div>
  `;
}


function openReportEditor(reportId){

  const panel = document.getElementById("reportEditPanel");

  if(!panel) return;

  const report = records.find(r => r.id === reportId);

  if(!report){

    panel.hidden = false;

    panel.innerHTML = `
      <div class="notice error">
        Report details could not be loaded.
      </div>
    `;

    return;
  }

  panel.hidden = false;

  panel.innerHTML = `
    <div class="report-edit-card">

      <div class="report-edit-header">

        <div>
          <small>UPDATE REPORT</small>
          <h3>${esc(report.problemNumber)}</h3>
        </div>

        <button
          type="button"
          class="edit-close"
          onclick="closeReportEditor()"
        >
          ×
        </button>

      </div>

      <label>
        Location

        <input
          id="editReportLocation"
          type="text"
          value="${esc(report.location || "")}"
        >
      </label>


      <label>
        Category

        <select id="editReportCategory">

          <option value="Plastic & Waste">
            Plastic & Waste
          </option>

          <option value="Chemical Contamination">
            Chemical Contamination
          </option>

          <option value="Industrial Pollution">
            Industrial Pollution
          </option>

          <option value="Agricultural Pollution">
            Agricultural Pollution
          </option>

          <option value="Water / Soil Contamination">
            Water / Soil Contamination
          </option>

          <option value="Other">
            Other
          </option>

        </select>

      </label>


      <label>
        Date noticed

        <input
          id="editReportDate"
          type="date"
          value="${esc(report.date || "")}"
        >
      </label>


      <label>
        Description

        <textarea
          id="editReportDescription"
          rows="5"
        >${esc(report.description || "")}</textarea>

      </label>


      <div class="report-edit-actions">

        <button
          type="button"
          class="btn btn-primary"
          onclick="saveReportUpdate('${esc(report.id)}')"
        >
          Save Changes
        </button>

        <button
          type="button"
          class="btn btn-secondary"
          onclick="closeReportEditor()"
        >
          Cancel
        </button>

      </div>


      <p
        id="reportEditMessage"
        class="form-message"
      ></p>

    </div>
  `;


  const categorySelect =
    document.getElementById("editReportCategory");

  if(categorySelect){

    categorySelect.value =
      report.category || "";

  }
}


function closeReportEditor(){

  const panel =
    document.getElementById("reportEditPanel");

  if(panel){

    panel.hidden = true;
    panel.innerHTML = "";

  }
}


async function saveReportUpdate(reportId){

  const message =
    document.getElementById("reportEditMessage");

  const location =
    document
      .getElementById("editReportLocation")
      ?.value
      .trim();

  const category =
    document
      .getElementById("editReportCategory")
      ?.value
      .trim();

  const dateNoticed =
    document
      .getElementById("editReportDate")
      ?.value;

  const description =
    document
      .getElementById("editReportDescription")
      ?.value
      .trim();


  if(
    !location ||
    !category ||
    !dateNoticed ||
    !description
  ){

    if(message){

      message.textContent =
        "Please complete all fields before saving.";

    }

    return;
  }


  if(message){

    message.textContent =
      "Saving your report update…";

  }


  const { data, error } =
    await supabase.rpc(
      "update_own_report",
      {
        p_report_id: reportId,
        p_location: location,
        p_category: category,
        p_date_noticed: dateNoticed,
        p_description: description
      }
    );


  if(error){

    console.error(
      "Report update error:",
      error
    );

    if(message){

      message.textContent =
        "Could not update the report: " +
        error.message;

    }

    return;
  }


  const updated =
    normalize(data);


  const index =
    records.findIndex(
      r => r.id === reportId
    );


  if(index !== -1){

    records[index] = {
      ...records[index],
      ...updated
    };

  }


  if(message){

    message.textContent =
      "Report updated successfully.";

  }


  const refreshed =
    records.find(
      r => r.id === reportId
    );


  if(refreshed){

    renderTrackResult(refreshed);

  }

}


async function trackReport(){

  const input =
    document.getElementById(
      "trackProblemNumber"
    );

  const msg =
    document.getElementById(
      "trackMessage"
    );


  if(!user){

    msg.textContent =
      "Please login first so SoilSafe can securely show your own report.";

    openLogin();

    return;
  }


  const pn =
    input.value
      .trim()
      .toUpperCase();


  if(!pn){

    msg.textContent =
      "Enter your Problem Number, for example SS-2026-000127.";

    renderTrackResult(null);

    return;
  }


  msg.textContent =
    "Searching your online records…";


  const local =
    records.find(
      r =>
        r.problemNumber &&
        r.problemNumber.toUpperCase() === pn
    );


  if(local){

    msg.textContent =
      "Report found.";

    renderTrackResult(local);

    return;
  }


  const {
    data,
    error
  } =
    await supabase
      .from("reports")
      .select("*")
      .eq("problem_number", pn)
      .eq("user_id", user.id)
      .maybeSingle();


  if(error){

    msg.textContent =
      "Could not search right now: " +
      error.message;

    return;
  }


  if(!data){

    msg.textContent =
      "No report with that Problem Number was found in your account.";

    renderTrackResult(null);

    return;
  }


  const r =
    normalize(data);


  msg.textContent =
    "Report found.";

  renderTrackResult(r);

}


document
  .getElementById("trackSearchBtn")
  ?.addEventListener(
    "click",
    trackReport
  );


document
  .getElementById("trackProblemNumber")
  ?.addEventListener(
    "keydown",
    e => {

      if(e.key === "Enter"){

        trackReport();

      }

    }
  );

window.openReportEditor = openReportEditor;
window.closeReportEditor = closeReportEditor;
window.saveReportUpdate = saveReportUpdate;
/* mobile navigation */
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn?.addEventListener("click", () => {
  nav?.classList.toggle("mobile-open");

  menuBtn?.setAttribute(
    "aria-expanded",
    nav?.classList.contains("mobile-open") ? "true" : "false"
  );
});

nav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    nav?.classList.remove("mobile-open");
    menuBtn?.setAttribute("aria-expanded", "false");
  });
});
    /* website ratings */
const starRating = document.getElementById("starRating");
const ratingLabel = document.getElementById("ratingLabel");
const ratingFeedback = document.getElementById("ratingFeedback");
const submitRating = document.getElementById("submitRating");
const ratingMessage = document.getElementById("ratingMessage");
const ratingAverage = document.getElementById("ratingAverage");
const ratingTotal = document.getElementById("ratingTotal");
const ratingStarsDisplay = document.getElementById("ratingStarsDisplay");

let selectedRating = 0;

const ratingLabels = {
  1: "Very poor",
  2: "Needs improvement",
  3: "Good",
  4: "Very good",
  5: "Excellent"
};

function updateRatingStars() {
  if (!starRating) return;

  starRating.querySelectorAll("button").forEach(button => {
    const value = Number(button.dataset.rating);

    button.classList.toggle(
      "selected",
      value <= selectedRating
    );
  });

  if (ratingLabel) {
    ratingLabel.textContent =
      selectedRating
        ? ratingLabels[selectedRating]
        : "Select a rating";
  }
}

starRating?.querySelectorAll("button").forEach(button => {
  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating);
    updateRatingStars();
  });
});

async function loadRatingSummary() {
  const ratingAverage = document.getElementById("ratingAverage");
  const ratingTotal = document.getElementById("ratingTotal");
  const ratingStarsDisplay = document.getElementById("ratingStarsDisplay");

  if (!ratingAverage || !ratingTotal || !ratingStarsDisplay) return;

  const { data, error } = await supabase.rpc(
    "get_website_rating_summary"
  );

  if (error) {
    console.error("Rating summary error:", error);
    return;
  }

  const row = data?.[0];

  const average = Number(row?.average_rating ?? 0);
  const total = Number(row?.total_ratings ?? 0);

  ratingAverage.textContent = average.toFixed(1);
  ratingTotal.textContent = total;

  const rounded = Math.round(average);

  ratingStarsDisplay.textContent =
    "★ ".repeat(rounded) +
    "☆ ".repeat(5 - rounded);
}
  

async function loadMyRating() {
  if (!supabase) return;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("website_ratings")
    .select("rating, feedback")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not load your rating:", error);
    return;
  }

  if (!data) return;

  selectedRating = data.rating;

  if (ratingFeedback) {
    ratingFeedback.value = data.feedback || "";
  }

  updateRatingStars();

  if (submitRating) {
    submitRating.innerHTML = 'Update rating <span>→</span>';
  }
}

submitRating?.addEventListener("click", async () => {
  ratingMessage.textContent = "";
  ratingMessage.className = "form-message";

  if (!supabase) {
    ratingMessage.textContent = "SoilSafe connection is not available.";
    return;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    ratingMessage.textContent =
      "Please login before submitting a rating.";
    ratingMessage.classList.add("error");
    return;
  }

  if (!selectedRating) {
    ratingMessage.textContent =
      "Please select a star rating first.";
    ratingMessage.classList.add("error");
    return;
  }

  submitRating.disabled = true;
  submitRating.innerHTML = "Saving...";

  const feedback =
    ratingFeedback?.value.trim() || null;

  const { error } = await supabase
    .from("website_ratings")
    .upsert(
      {
        user_id: user.id,
        rating: selectedRating,
        feedback: feedback,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "user_id"
      }
    );

  submitRating.disabled = false;

  if (error) {
    console.error("Rating error:", error);

    ratingMessage.textContent =
      "Could not save your rating. Please try again.";

    ratingMessage.classList.add("error");

    submitRating.innerHTML =
      "Submit rating <span>→</span>";

    return;
  }

  ratingMessage.textContent =
    "Thank you! Your rating has been saved.";

  ratingMessage.classList.add("success");

  submitRating.innerHTML =
    "Update rating <span>→</span>";

  await loadRatingSummary();
});

loadRatingSummary();
loadMyRating();
/* notifications */
function renderNotifications(){
  const list = document.getElementById("notificationList");
  if(!list) return;

  if(!user){
    list.innerHTML =
      '<div class="notification-empty">Login to receive report updates here.</div>';
    return;
  }

  if(!notifications.length){
    list.innerHTML =
      '<div class="notification-empty">No notifications yet. Your report updates will appear here.</div>';
    return;
  }

  list.innerHTML = notifications.map(n => `
    <button
      type="button"
      class="notification-item ${n.read_at ? "read" : "unread"}"
      data-notification="${esc(n.id)}"
      data-report-id="${esc(n.report_id || "")}"
    >
      <span class="notification-dot"></span>

      <span>
        <b>${esc(n.title)}</b>
        <small>${esc(n.message)}</small>
        <em>${new Date(n.created_at).toLocaleString()}</em>
      </span>
    </button>
  `).join("");

  document.querySelectorAll("[data-notification]").forEach(btn => {

    btn.addEventListener("click", () => {

      const notificationId = btn.dataset.notification;
      const reportId = btn.dataset.reportId;

      if(reportId && typeof openAdminNotification === "function"){
        openAdminNotification(notificationId, reportId);
      }else{
        markNotificationRead(notificationId);
      }

    });

  });

  updateAuthUI();
}


async function openAdminNotification(notificationId, reportId){

  await markNotificationRead(notificationId);

  if(!reportId) return;

  // Only admin should jump to the admin report
  if(!isAdmin) return;

  // Make sure the admin section is visible
  const adminSection = document.getElementById("admin");

  if(adminSection){
    adminSection.classList.remove("hidden");
  }

  // Re-render admin reports
  if(typeof renderAdmin === "function"){
    renderAdmin();
  }

  // Wait for the report cards to be created
  setTimeout(() => {

    const reportElement =
      document.querySelector(
        `[data-report-id="${CSS.escape(reportId)}"]`
      );

    if(reportElement){

      reportElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      reportElement.classList.add("notification-highlight");

      setTimeout(() => {
        reportElement.classList.remove("notification-highlight");
      }, 2500);

    }else{
      console.warn(
        "SoilSafe: report element not found:",
        reportId
      );
    }

  }, 500);
}

async function markNotificationRead(id){
  if(!supabase || !user) return;

  await supabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("user_id", user.id);

  const n = notifications.find(x => x.id === id);

  if(n){
    n.read_at = new Date().toISOString();
  }

  renderNotifications();
}


async function markAllNotificationsRead(){
  if(!supabase || !user) return;

  await supabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString()
    })
    .eq("user_id", user.id)
    .is("read_at", null);

  notifications.forEach(n => {
    if(!n.read_at){
      n.read_at = new Date().toISOString();
    }
  });

  renderNotifications();
}


function toggleNotifications(){
  const pop = document.getElementById("notificationPopover");
  if(!pop) return;

  pop.classList.toggle("open");

  if(pop.classList.contains("open")){
    loadNotifications();
  }
}


document
  .getElementById("notificationBtn")
  ?.addEventListener("click", toggleNotifications);

document
  .getElementById("mobileNotifyBtn")
  ?.addEventListener("click", toggleNotifications);

document
  .getElementById("markNotificationsRead")
  ?.addEventListener("click", markAllNotificationsRead);


document.addEventListener("click", e => {

  const pop = document.getElementById("notificationPopover");

  if(
    pop?.classList.contains("open") &&
    !pop.contains(e.target) &&
    !e.target.closest("#notificationBtn") &&
    !e.target.closest("#mobileNotifyBtn")
  ){
    pop.classList.remove("open");
  }

});
  async function loadAdminRatings() {
  const box = document.getElementById("adminRatings");
  if (!box || !isAdmin || !supabase) return;

  box.innerHTML = `
    <div class="admin-rating-loading">
      Loading user ratings and feedback…
    </div>
  `;

  const { data, error } = await supabase
    .from("website_ratings")
    .select("id,user_id,rating,feedback,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin ratings error:", error);
    box.innerHTML = `
      <div class="empty">
        Could not load ratings: ${esc(error.message)}
      </div>
    `;
    return;
  }

  const ratings = data || [];

  if (!ratings.length) {
    box.innerHTML = `
      <div class="empty">
        No user ratings have been submitted yet.
      </div>
    `;
    return;
  }

  const average =
    ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
    ratings.length;

  box.innerHTML = `
    <div class="admin-rating-head">
      <div>
        <small>USER FEEDBACK</small>
        <h2>SoilSafe ratings</h2>
        <p>
          ${ratings.length} rating${ratings.length === 1 ? "" : "s"}
          · Average ${average.toFixed(1)} / 5
        </p>
      </div>

      <div class="admin-rating-average">
        <strong>${average.toFixed(1)}</strong>
        <span>★</span>
      </div>
    </div>

    <div class="admin-rating-list">
      ${ratings.map(r => `
        <article class="admin-rating-item">
          <div class="admin-rating-top">
            <div class="admin-rating-stars">
              ${"★".repeat(Number(r.rating))}
              <span>${"☆".repeat(5 - Number(r.rating))}</span>
            </div>

            <small>
              ${new Date(r.created_at).toLocaleDateString()}
            </small>
          </div>

          <div class="admin-rating-score">
            ${Number(r.rating)} / 5
          </div>

          <p>
            ${
              r.feedback
                ? esc(r.feedback)
                : "<em>No written feedback provided.</em>"
            }
          </p>
        </article>
      `).join("")}
    </div>
  `;
}

/* admin */
function renderAdmin(){if(!isAdmin)return;const counts={new:0,review:0,responded:0,confirmed:0};records.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);document.getElementById("adminStats").innerHTML=[['NEW',counts.new],['UNDER REVIEW',counts.review],['RESPONSE SUGGESTED',counts.responded],['RESOLVED',counts.confirmed]].map(x=>`<div class="impact-card"><strong>${x[1]}</strong><span>${x[0]}</span></div>`).join("");document.getElementById("adminReports").innerHTML=records.length?records.map(r=>`<article class="admin-report" data-report-id="${esc(r.id)}"><div class="admin-report-head"><div><span class="badge">${esc(r.statusLabel)}</span><div class="admin-problem-number">${esc(r.problemNumber)}</div><h3>${esc(r.category)}</h3><small>${esc(r.location)} · ${esc(r.date)} · ${r.reporterType==="lpu_student"?"LPU student":"Another place"} · ${esc(r.reporter)}</small></div>${r.photo?`<a href="${esc(r.photo)}" target="_blank" rel="noreferrer">View photo ↗</a>`:""}</div><p>${esc(r.description)}</p><div class="admin-edit"><label>Status<select data-status="${esc(r.id)}"><option value="new" ${r.status==='new'?'selected':''}>New</option><option value="review" ${r.status==='review'?'selected':''}>Under review</option><option value="responded" ${r.status==='responded'?'selected':''}>Response suggested</option><option value="confirmed" ${r.status==='confirmed'?'selected':''}>Resolved</option></select></label><label>Message to reporter<textarea data-message="${esc(r.id)}" rows="3" placeholder="Write the message the reporter should receive">${esc(r.adminMessage)}</textarea></label><label>Suggested solution<textarea data-solution="${esc(r.id)}" rows="3">${esc(r.solution)}</textarea></label><button class="lime-btn save-admin" data-save="${esc(r.id)}">Save update & notify user →</button></div><div class="admin-result" id="admin-result-${esc(r.id)}"></div></article>`).join(""):'<div class="empty">No online reports yet.</div>';document.querySelectorAll(".save-admin").forEach(btn=>btn.addEventListener("click",()=>updateAdminReport(btn.dataset.save)));  const adminReports = document.getElementById("adminReports");  if (adminReports && !document.getElementById("adminRatings")) {   adminReports.insertAdjacentHTML("beforeend", `     <section class="admin-ratings-section" id="adminRatings">       <div class="admin-rating-loading">         Loading user ratings and feedback…       </div>     </section>   `); }  loadAdminRatings(); }
async function updateAdminReport(id){
  const btn = document.querySelector(
    `[data-save="${CSS.escape(id)}"]`
  );

  const status = document.querySelector(
    `[data-status="${CSS.escape(id)}"]`
  ).value;

  const solution = document.querySelector(
    `[data-solution="${CSS.escape(id)}"]`
  ).value.trim();

  const adminMessage = document.querySelector(
    `[data-message="${CSS.escape(id)}"]`
  ).value.trim();

  const out = document.getElementById(
    "admin-result-" + id
  );

  btn.disabled = true;
  out.textContent = "Saving update and sending notification…";

  try {

    /* 1. Update the report + create in-app notification */
    const { data, error } = await supabase.rpc(
      "admin_update_report",
      {
        p_report_id: id,
        p_status: status,
        p_solution: solution,
        p_admin_message: adminMessage
      }
    );

    if (error) throw error;

    const i = records.findIndex(
      r => r.id === id
    );

    if (i >= 0) {
      records[i] = normalize(data);
    }

    /* 2. Send email notification */
    const {
      data: emailResult,
      error: emailError
    } = await supabase.functions.invoke(
      "smooth-api",
      {
        body: {
          report_id: id
        }
      }
    );

    if (emailError) {
      console.error(
        "Email notification error:",
        emailError
      );

      out.textContent =
        `Report updated successfully, but the email could not be sent. ` +
        `The user still has the in-app notification.`;
    } else {
      console.log(
        "SoilSafe email sent:",
        emailResult
      );

      out.textContent =
        `Updated ${
          records[i]?.problemNumber || "report"
        }. The reporter has been notified by email and in SoilSafe.`;
    }

    /* 3. Refresh notifications and UI */
    await loadNotifications();

    renderAll();

  } catch (err) {

    console.error(
      "Admin report update error:",
      err
    );

    out.textContent =
      "Update failed: " +
      (err.message || "unknown error");

  } finally {

    btn.disabled = false;

  }
}
document.getElementById("refreshAdmin").addEventListener("click",async()=>{await loadReports();renderAll();});

/* export */
function download(name,text,type){const blob=new Blob([text],{type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
document.getElementById("exportJson").addEventListener("click",()=>download("soilsafe-records.json",JSON.stringify(records,null,2),"application/json"));
document.getElementById("exportCsv").addEventListener("click",()=>{const fields=["problemNumber","id","date","location","reporter","reporterType","category","status","evidenceLevel","description","solution","adminMessage"];const csv=[fields.join(","),...records.map(r=>fields.map(f=>`"${String(r[f]??"").replace(/"/g,'""')}"`).join(","))].join("\n");download("soilsafe-records.csv",csv,"text/csv")});
document.getElementById("printReport").addEventListener("click",()=>window.print());

/* profile/account */
const profileModal=document.getElementById("profileModal");
function openProfile(){if(!user){openLogin();return;}renderProfile();profileModal?.classList.add("open");setTimeout(()=>document.getElementById("profileName")?.focus(),50);}
function closeProfile(){profileModal?.classList.remove("open");}
function renderProfile(){if(!user)return;const p=profile||{};const name=p.full_name||user.email?.split("@")[0]||"SoilSafe user";const a=document.getElementById("profileAvatar");if(a)a.textContent=name.charAt(0).toUpperCase();document.getElementById("profileHeading")&&(document.getElementById("profileHeading").textContent=isAdmin?"Admin profile":"My profile");document.getElementById("profileEmail")&&(document.getElementById("profileEmail").textContent=user.email||"");document.getElementById("profileName")&&(document.getElementById("profileName").value=p.full_name||"");document.getElementById("profileCity")&&(document.getElementById("profileCity").value=p.city||"");document.getElementById("profileBio")&&(document.getElementById("profileBio").value=p.bio||"");document.getElementById("profileAffiliation")&&(document.getElementById("profileAffiliation").value=p.affiliation_type||"other_place");const mine=records.filter(r=>r.user_id===user.id);const stats=document.getElementById("profileStats");if(stats)stats.innerHTML=`<div class="profile-stat"><b>${mine.length}</b><span>My reports</span></div><div class="profile-stat"><b>${mine.filter(r=>r.status==='confirmed').length}</b><span>Resolved</span></div><div class="profile-stat"><b>${p.created_at?new Date(p.created_at).toLocaleDateString():"—"}</b><span>Member since</span></div>`;}
async function saveProfile(){if(!supabase||!user)return;const msg=document.getElementById("profileMessage"),name=document.getElementById("profileName").value.trim();if(!name){msg.textContent="Please enter your full name.";return;}msg.textContent="Saving profile…";const payload={id:user.id,full_name:name,bio:document.getElementById("profileBio").value.trim(),city:document.getElementById("profileCity").value.trim(),affiliation_type:document.getElementById("profileAffiliation").value,updated_at:new Date().toISOString()};const {data,error}=await supabase.from("profiles").upsert(payload).select().single();if(error){msg.textContent="Could not save profile: "+error.message;return;}profile={...(profile||{}),...data};msg.textContent="Profile saved online.";updateAuthUI();setTimeout(()=>msg.textContent="",1800);}
document.getElementById("saveProfile")?.addEventListener("click",saveProfile);document.getElementById("closeProfile")?.addEventListener("click",closeProfile);document.querySelectorAll("[data-profile-close]").forEach(x=>x.addEventListener("click",closeProfile));

/* auth */
const modal=document.getElementById("loginModal");
const loginBtn=document.getElementById("loginBtn");
const mobileLoginBtn=document.getElementById("mobileLoginBtn");
function openLogin(){
  if(!modal)return;
  modal.classList.add("open");
  const msg=document.getElementById("loginMessage");
  if(msg && !supabase) msg.textContent="Connect your Supabase URL and public key in supabase-config.js to enable real online login.";
  setTimeout(()=>document.getElementById("loginEmail")?.focus(),50);
}
function closeLogin(){modal?.classList.remove("open");}
loginBtn?.addEventListener("click",()=>{if(user)openProfile();else openLogin();});
mobileLoginBtn?.addEventListener("click",()=>{if(user)openProfile();else openLogin();});
document.querySelectorAll("[data-close]").forEach(x=>x.addEventListener("click",closeLogin));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLogin();if(e.key==="Enter"&&modal?.classList.contains("open")){document.getElementById("loginSubmit")?.click();}});

document.getElementById("loginSubmit")?.addEventListener("click",async()=>{
  const email=document.getElementById("loginEmail").value.trim(),password=document.getElementById("loginPassword").value,msg=document.getElementById("loginMessage");
  if(!supabase){msg.textContent="Real login is not connected yet. Open supabase-config.js and add your Supabase Project URL and public/publishable key.";return;}
  if(!email||!password){msg.textContent="Enter your email and password.";return;}
  msg.textContent="Logging in…";
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error){msg.textContent=error.message;return;}
  await boot();msg.textContent="Login successful.";setTimeout(closeLogin,500);
});

document.getElementById("signupSubmit")?.addEventListener("click",async()=>{
  const email=document.getElementById("loginEmail").value.trim(),password=document.getElementById("loginPassword").value,msg=document.getElementById("loginMessage");
  if(!supabase){msg.textContent="Real account creation is not connected yet. Add your Supabase Project URL and public/publishable key first.";return;}
  if(!email||password.length<6){msg.textContent="Enter an email and a password with at least 6 characters.";return;}
  msg.textContent="Creating account…";
  const {data,error}=await supabase.auth.signUp({email,password});
  if(error){msg.textContent=error.message;return;}
  if(data.user){const {error:profileError}=await supabase.from("profiles").upsert({id:data.user.id,full_name:email.split("@")[0],role:"student"});if(profileError)console.warn("Profile creation:",profileError.message);}
  msg.textContent="Account created. Check your email if confirmation is enabled, then login.";
});

document.getElementById("logoutBtn")?.addEventListener("click",async()=>{if(supabase)await supabase.auth.signOut();user=null;isAdmin=false;records=[];notifications=[];updateAuthUI();renderNotifications();renderAll();});

async function boot(){user=await getSession();await loadProfile();await loadReports();await loadNotifications();updateAuthUI();renderAll();}
if(supabase){supabase.auth.onAuthStateChange(async()=>{user=await getSession();await loadProfile();await loadReports();await loadNotifications();updateAuthUI();renderAll();});}
updateAuthUI();renderAll();

  })();
}
