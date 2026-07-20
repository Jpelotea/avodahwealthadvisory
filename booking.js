(() => {
  const STORAGE_KEY = "avodahBookingLeadId";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const widgets = () => [...document.querySelectorAll("[data-booking-widget]")];
  const readLead = () => { try { return sessionStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; } };
  const saveLead = (value) => { try { sessionStorage.setItem(STORAGE_KEY, value); } catch {} };
  const clearLead = () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch {} };
  const formatSlot = (iso) => new Intl.DateTimeFormat("en-PH",{timeZone:"Asia/Manila",weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(iso));

  const setupWidget = (widget, leadId) => {
    if (!UUID_PATTERN.test(leadId) || widget.dataset.bookingReady === "true") return;
    widget.dataset.bookingReady = "true";
    widget.hidden = false;
    const openButton=widget.querySelector("[data-booking-open]"),panel=widget.querySelector("[data-booking-panel]"),status=widget.querySelector("[data-booking-status]"),dateSelect=widget.querySelector("[data-booking-date]"),times=widget.querySelector("[data-booking-times]"),selection=widget.querySelector("[data-booking-selection]"),confirmButton=widget.querySelector("[data-booking-confirm]"),success=widget.querySelector("[data-booking-success]"),fallback=widget.querySelector("[data-booking-fallback]");
    let days=[],selectedStart="";

    const showFallback=(message)=>{status.textContent=message||"Online scheduling is temporarily unavailable.";fallback.hidden=false;confirmButton.disabled=true;};
    const renderTimes=()=>{
      const day=days.find((item)=>item.date===dateSelect.value);
      times.replaceChildren();selectedStart="";selection.textContent="";confirmButton.disabled=true;
      if(!day||!day.slots.length){times.textContent="No available times for this date.";return;}
      day.slots.forEach((slot)=>{
        const button=document.createElement("button");button.type="button";button.className="booking-time-button";button.textContent=slot.label;button.dataset.start=slot.start;button.setAttribute("aria-pressed","false");
        button.addEventListener("click",()=>{times.querySelectorAll("button").forEach((item)=>{item.classList.toggle("is-selected",item===button);item.setAttribute("aria-pressed",String(item===button));});selectedStart=slot.start;selection.textContent="Selected: "+formatSlot(slot.start)+" (Asia/Manila)";confirmButton.disabled=false;});
        times.appendChild(button);
      });
    };

    const loadAvailability=async()=>{
      openButton.disabled=true;openButton.textContent="Checking availability…";panel.hidden=false;status.textContent="Checking representative's available times…";fallback.hidden=true;
      try{
        const response=await fetch("/api/booking-slots",{headers:{Accept:"application/json"},cache:"no-store"});const result=await response.json();
        if(!response.ok||!result.ok)throw new Error("Availability unavailable");
        days=result.days||[];dateSelect.replaceChildren();
        days.forEach((day)=>{const option=document.createElement("option");option.value=day.date;option.textContent=day.label+" — "+day.slots.length+" available";dateSelect.appendChild(option);});
        if(!days.length){showFallback("No online slots are currently available. Your consultation request remains active.");return;}
        status.textContent="Times shown are in Asia/Manila. Appointments are 30 minutes with a 30-minute buffer.";renderTimes();
      }catch{showFallback("Online scheduling is not available yet. Your consultation request remains New for manual follow-up.");}
      finally{openButton.hidden=true;}
    };

    const confirmBooking=async()=>{
      if(!selectedStart)return;confirmButton.disabled=true;confirmButton.textContent="Booking…";status.textContent="Reserving your selected time…";
      try{
        const response=await fetch("/api/book-consultation",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({lead_id:leadId,start:selectedStart})});const result=await response.json();
        if(!response.ok||!result.ok){if(result.code==="SLOT_UNAVAILABLE"){status.textContent="That time was just taken. Please refresh the available times.";openButton.hidden=false;openButton.disabled=false;openButton.textContent="Refresh Available Times";panel.hidden=true;return;}throw new Error("Booking failed");}
        panel.hidden=true;success.hidden=false;success.innerHTML="<h3>Consultation booked</h3><p><strong>"+formatSlot(result.start)+"</strong></p><p>A calendar invitation has been sent when an email address was provided.</p>";
        if(result.meet_link){const link=document.createElement("a");link.className="button button-primary";link.href=result.meet_link;link.target="_blank";link.rel="noopener";link.textContent="Open Google Meet";success.appendChild(link);}
        success.focus();clearLead();
        if(typeof window.gtag==="function"){window.gtag("event","appointment_booked",{send_to:"G-HV9X54P7NT",booking_owner:"maam_christine",meeting_type:"google_meet"});}
      }catch{status.textContent="We could not reserve the time. Your request remains active for manual follow-up.";fallback.hidden=false;confirmButton.disabled=false;}
      finally{confirmButton.textContent="Confirm Appointment";}
    };
    openButton.addEventListener("click",loadAvailability);dateSelect.addEventListener("change",renderTimes);confirmButton.addEventListener("click",confirmBooking);
  };

  const activate=(leadId)=>{if(!UUID_PATTERN.test(leadId))return;saveLead(leadId);widgets().forEach((widget)=>setupWidget(widget,leadId));};
  window.AvodahBooking={activate};
  const existingLeadId=readLead();if(existingLeadId)activate(existingLeadId);
})();
